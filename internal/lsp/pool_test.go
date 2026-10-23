package lsp

import (
	"context"
	"encoding/json/v2"
	"errors"
	"net"
	"slices"
	"sync"
	"testing"
	"testing/synctest"
	"time"

	"github.com/obsfx/oversee/internal/lsp/lsptest"
)

const (
	poolIdle  = 10 * time.Minute
	poolRetry = 15 * time.Second
	goplsA    = "gopls\x00v1\x00/repo/a"
	goplsB    = "gopls\x00v1\x00/repo/b"
	tslsA     = "tsls\x00v1\x00/repo/a"
)

var errLaunchFailed = errors.New("spawn gopls: executable file not found")

type poolServers struct {
	mu         sync.Mutex
	starts     map[string]int
	servers    map[string][]*fakeServer
	transports []*lsptest.PipeTransport
	gates      map[string]chan struct{}
	launchErrs map[string]error
	failures   map[string]string
	silent     map[string]bool
	causes     map[string]error
}

func newTestPool(t *testing.T) (*Pool, *poolServers) {
	t.Helper()
	servers := &poolServers{
		starts:     map[string]int{},
		servers:    map[string][]*fakeServer{},
		gates:      map[string]chan struct{}{},
		launchErrs: map[string]error{},
		failures:   map[string]string{},
		silent:     map[string]bool{},
		causes:     map[string]error{},
	}
	pool := NewPool(poolIdle, poolRetry)
	t.Cleanup(func() {
		pool.Close()
		servers.close()
	})
	return pool, servers
}

func (p *poolServers) launch(key string) Launch {
	return Launch{Key: key, Root: testRoot, Start: func(ctx context.Context) (Transport, map[string]any, error) {
		p.mu.Lock()
		p.starts[key]++
		gate, launchErr := p.gates[key], p.launchErrs[key]
		p.mu.Unlock()
		if gate != nil {
			select {
			case <-gate:
			case <-ctx.Done():
				p.mu.Lock()
				p.causes[key] = context.Cause(ctx)
				p.mu.Unlock()
				return nil, nil, context.Cause(ctx)
			}
		}
		if launchErr != nil {
			return nil, nil, launchErr
		}
		clientEnd, serverEnd := net.Pipe()
		p.mu.Lock()
		server := &fakeServer{conn: serverEnd, failures: p.failures, silent: p.silent, stopped: make(chan struct{})}
		transport := lsptest.NewPipeTransport(clientEnd)
		p.servers[key] = append(p.servers[key], server)
		p.transports = append(p.transports, transport)
		p.mu.Unlock()
		go server.serve()
		return transport, nil, nil
	}}
}

func (p *poolServers) hold(key string) chan struct{} {
	p.mu.Lock()
	defer p.mu.Unlock()
	gate := make(chan struct{})
	p.gates[key] = gate
	return gate
}

func (p *poolServers) configure(change func()) {
	p.mu.Lock()
	defer p.mu.Unlock()
	change()
}

func (p *poolServers) startsOf(key string) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.starts[key]
}

func (p *poolServers) server(key string, index int) *fakeServer {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.servers[key][index]
}

func (p *poolServers) causeOf(key string) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.causes[key]
}

func (p *poolServers) close() {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, transport := range p.transports {
		transport.Kill()
	}
	for _, servers := range p.servers {
		for _, server := range servers {
			server.conn.Close()
			<-server.stopped
		}
	}
}

type clientResult struct {
	client *Client
	err    error
}

func (p *Pool) clientOf(ctx context.Context, servers *poolServers, key string) <-chan clientResult {
	results := make(chan clientResult, 1)
	go func() {
		client, err := p.Client(ctx, servers.launch(key))
		results <- clientResult{client: client, err: err}
	}()
	return results
}

func mustClient(t *testing.T, pool *Pool, servers *poolServers, key string) *Client {
	t.Helper()
	client, err := pool.Client(t.Context(), servers.launch(key))
	if err != nil {
		t.Fatalf("Client(%q) error = %v", key, err)
	}
	return client
}

func expectStopped(t *testing.T, client *Client, server *fakeServer, want bool) {
	t.Helper()
	methods := server.methods()
	stopped := closed(client.Done()) && slices.Contains(methods, "shutdown") && slices.Contains(methods, "exit")
	running := !closed(client.Done()) && !slices.Contains(methods, "shutdown") && !slices.Contains(methods, "exit")
	if want && !stopped {
		t.Fatalf("session is not shut down: done %t, server saw %q", closed(client.Done()), methods)
	}
	if !want && !running {
		t.Fatalf("session is not running: done %t, server saw %q", closed(client.Done()), methods)
	}
}

func TestPoolStartsOneSessionForConcurrentCallers(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		pool, servers := newTestPool(t)
		gate := servers.hold(goplsA)
		var pending []<-chan clientResult
		for range 4 {
			pending = append(pending, pool.clientOf(t.Context(), servers, goplsA))
		}
		synctest.Wait()
		if starts := servers.startsOf(goplsA); starts != 1 {
			t.Fatalf("starts while starting = %d, want 1", starts)
		}
		close(gate)
		var first *Client
		for _, results := range pending {
			result := await(t, results)
			if result.err != nil || result.client == nil {
				t.Fatalf("Client() = %v, %v, want a client", result.client, result.err)
			}
			if first == nil {
				first = result.client
			}
			if result.client != first {
				t.Fatalf("callers got different clients")
			}
		}
		if again := mustClient(t, pool, servers, goplsA); again != first {
			t.Fatalf("a later caller got another client")
		}
		if starts := servers.startsOf(goplsA); starts != 1 {
			t.Fatalf("starts = %d, want 1", starts)
		}
	})
}

func TestPoolAnswersStartingUntilTheSessionIsReady(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		pool, servers := newTestPool(t)
		gate := servers.hold(goplsA)
		ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
		defer cancel()
		began := time.Now()
		if _, err := pool.Client(ctx, servers.launch(goplsA)); !errors.Is(err, ErrStarting) {
			t.Fatalf("Client() error = %v, want ErrStarting", err)
		}
		if waited := time.Since(began); waited != 10*time.Second {
			t.Fatalf("Client() waited %s, want the caller's 10s deadline", waited)
		}
		close(gate)
		synctest.Wait()
		mustClient(t, pool, servers, goplsA)
		if starts := servers.startsOf(goplsA); starts != 1 {
			t.Fatalf("starts = %d, want the first start to keep going", starts)
		}
	})
}

func TestPoolRetriesAFailedStartOnlyAfterTheRetryDelay(t *testing.T) {
	tests := []struct {
		name      string
		configure func(servers *poolServers)
		repair    func(servers *poolServers)
		wantErr   func(error) bool
		wantTook  time.Duration
	}{
		{
			name: "a launch that fails",
			configure: func(servers *poolServers) {
				servers.launchErrs[goplsA] = errLaunchFailed
			},
			repair: func(servers *poolServers) {
				delete(servers.launchErrs, goplsA)
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errLaunchFailed)
			},
		},
		{
			name: "an initialize that fails",
			configure: func(servers *poolServers) {
				servers.failures["initialize"] = `{"code":-32603,"message":"no go.mod"}`
			},
			repair: func(servers *poolServers) {
				delete(servers.failures, "initialize")
			},
			wantErr: func(err error) bool {
				responseErr, ok := errors.AsType[*ResponseError](err)
				return ok && responseErr.Message == "no go.mod"
			},
		},
		{
			name: "an initialize that never answers",
			configure: func(servers *poolServers) {
				servers.silent["initialize"] = true
			},
			repair: func(servers *poolServers) {
				delete(servers.silent, "initialize")
			},
			wantErr: func(err error) bool {
				return errors.Is(err, errStartTimeout)
			},
			wantTook: 2 * time.Minute,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				pool, servers := newTestPool(t)
				servers.configure(func() {
					test.configure(servers)
				})
				began := time.Now()
				_, err := pool.Client(t.Context(), servers.launch(goplsA))
				if !test.wantErr(err) {
					t.Fatalf("Client() error = %v, not the start failure", err)
				}
				if took := time.Since(began); took != test.wantTook {
					t.Fatalf("Client() took %s, want %s", took, test.wantTook)
				}
				servers.configure(func() {
					test.repair(servers)
				})
				time.Sleep(poolRetry - time.Millisecond)
				if _, again := pool.Client(t.Context(), servers.launch(goplsA)); !test.wantErr(again) {
					t.Fatalf("Client() within the retry delay error = %v, want the same failure", again)
				}
				if starts := servers.startsOf(goplsA); starts != 1 {
					t.Fatalf("starts within the retry delay = %d, want 1", starts)
				}
				time.Sleep(time.Millisecond)
				mustClient(t, pool, servers, goplsA)
				if starts := servers.startsOf(goplsA); starts != 2 {
					t.Fatalf("starts after the retry delay = %d, want 2", starts)
				}
			})
		})
	}
}

func TestPoolRestartsACrashedSessionOnlyAfterTheRetryDelay(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		pool, servers := newTestPool(t)
		crashed := mustClient(t, pool, servers, goplsA)
		servers.server(goplsA, 0).conn.Close()
		synctest.Wait()
		if !closed(crashed.Done()) {
			t.Fatalf("the client did not notice the crash")
		}
		if _, err := pool.Client(t.Context(), servers.launch(goplsA)); !errors.Is(err, ErrClosed) {
			t.Fatalf("Client() after the crash error = %v, want ErrClosed", err)
		}
		time.Sleep(poolRetry - time.Millisecond)
		if _, err := pool.Client(t.Context(), servers.launch(goplsA)); !errors.Is(err, ErrClosed) {
			t.Fatalf("Client() within the retry delay error = %v, want ErrClosed", err)
		}
		if starts := servers.startsOf(goplsA); starts != 1 {
			t.Fatalf("starts within the retry delay = %d, want 1", starts)
		}
		time.Sleep(time.Millisecond)
		restarted := mustClient(t, pool, servers, goplsA)
		if restarted == crashed || closed(restarted.Done()) {
			t.Fatalf("Client() after the retry delay did not start a new session")
		}
		if starts := servers.startsOf(goplsA); starts != 2 {
			t.Fatalf("starts after the retry delay = %d, want 2", starts)
		}
	})
}

func TestPoolStopsSessionsThatStayIdle(t *testing.T) {
	tests := []struct {
		name        string
		usedAgainAt time.Duration
		aliveAt     time.Duration
		stoppedAt   time.Duration
	}{
		{name: "a session nobody uses", aliveAt: 10 * time.Minute, stoppedAt: 11 * time.Minute},
		{name: "a session used again after 6 minutes", usedAgainAt: 6 * time.Minute, aliveAt: 16 * time.Minute, stoppedAt: 17 * time.Minute},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				pool, servers := newTestPool(t)
				began := time.Now()
				client := mustClient(t, pool, servers, goplsA)
				if test.usedAgainAt > 0 {
					time.Sleep(test.usedAgainAt)
					mustClient(t, pool, servers, goplsA)
				}
				time.Sleep(test.aliveAt - time.Since(began))
				synctest.Wait()
				expectStopped(t, client, servers.server(goplsA, 0), false)
				time.Sleep(test.stoppedAt - test.aliveAt)
				synctest.Wait()
				expectStopped(t, client, servers.server(goplsA, 0), true)
				if next := mustClient(t, pool, servers, goplsA); next == client {
					t.Fatalf("Client() after the idle stop returned the stopped client")
				}
				if starts := servers.startsOf(goplsA); starts != 2 {
					t.Fatalf("starts = %d, want 2", starts)
				}
			})
		})
	}
}

func TestPoolKeepsAStartingSessionPastTheIdleTime(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		pool, servers := newTestPool(t)
		gate := servers.hold(goplsA)
		ctx, cancel := context.WithTimeout(t.Context(), time.Second)
		defer cancel()
		if _, err := pool.Client(ctx, servers.launch(goplsA)); !errors.Is(err, ErrStarting) {
			t.Fatalf("Client() error = %v, want ErrStarting", err)
		}
		time.Sleep(3 * poolIdle)
		synctest.Wait()
		close(gate)
		synctest.Wait()
		client := mustClient(t, pool, servers, goplsA)
		if starts := servers.startsOf(goplsA); starts != 1 {
			t.Fatalf("starts = %d, want the starting session to survive the sweep", starts)
		}
		expectStopped(t, client, servers.server(goplsA, 0), false)
	})
}

func TestPoolStopsSessionsByKeyPrefix(t *testing.T) {
	keys := []string{goplsA, goplsB, tslsA}
	tests := []struct {
		name    string
		prefix  string
		stopped []string
	}{
		{name: "every session of a server", prefix: "gopls\x00", stopped: []string{goplsA, goplsB}},
		{name: "one root of a server version", prefix: goplsA, stopped: []string{goplsA}},
		{name: "a prefix that matches no key", prefix: "gopls\x00v2\x00"},
		{name: "every session", prefix: "", stopped: keys},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				pool, servers := newTestPool(t)
				clients := map[string]*Client{}
				for _, key := range keys {
					clients[key] = mustClient(t, pool, servers, key)
				}
				pool.Stop(test.prefix)
				synctest.Wait()
				for _, key := range keys {
					stopped := slices.Contains(test.stopped, key)
					expectStopped(t, clients[key], servers.server(key, 0), stopped)
					again := mustClient(t, pool, servers, key)
					if stopped == (again == clients[key]) {
						t.Fatalf("Client(%q) after Stop reused the session %t, want %t", key, again == clients[key], !stopped)
					}
				}
			})
		})
	}
}

func TestPoolCloseStopsEverySessionAndRefusesNewOnes(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		pool, servers := newTestPool(t)
		ready := mustClient(t, pool, servers, goplsA)
		servers.hold(tslsA)
		ctx, cancel := context.WithTimeout(t.Context(), time.Second)
		defer cancel()
		if _, err := pool.Client(ctx, servers.launch(tslsA)); !errors.Is(err, ErrStarting) {
			t.Fatalf("Client() error = %v, want ErrStarting", err)
		}
		began := time.Now()
		pool.Close()
		if took := time.Since(began); took != 3*time.Second {
			t.Fatalf("Close() took %s, want the 3s a starting session gets", took)
		}
		expectStopped(t, ready, servers.server(goplsA, 0), true)
		if cause := servers.causeOf(tslsA); !errors.Is(cause, errStopped) {
			t.Fatalf("the starting launch ended with %v, want errStopped", cause)
		}
		if _, err := pool.Client(t.Context(), servers.launch(goplsB)); !errors.Is(err, ErrClosed) {
			t.Fatalf("Client() after Close error = %v, want ErrClosed", err)
		}
		if starts := servers.startsOf(goplsB); starts != 0 {
			t.Fatalf("a closed pool started %d sessions", starts)
		}
	})
}

func TestPoolForwardsFileChangesToLiveSessions(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		pool, servers := newTestPool(t)
		mustClient(t, pool, servers, goplsA)
		mustClient(t, pool, servers, tslsA)
		servers.configure(func() {
			servers.launchErrs[goplsB] = errLaunchFailed
		})
		if _, err := pool.Client(t.Context(), servers.launch(goplsB)); !errors.Is(err, errLaunchFailed) {
			t.Fatalf("Client() error = %v, want the launch failure", err)
		}
		pool.FilesChanged(nil)
		events := []FileEvent{FileEventOf("/repo/a/main.go", true), FileEventOf("/repo/a/old.go", false)}
		pool.FilesChanged(events)
		synctest.Wait()
		for _, key := range []string{goplsA, tslsA} {
			server := servers.server(key, 0)
			var changes [][]FileEvent
			server.mu.Lock()
			for _, message := range server.received {
				if message.Method != "workspace/didChangeWatchedFiles" {
					continue
				}
				var params didChangeWatchedFilesParams
				if err := json.Unmarshal(message.Params, &params); err != nil {
					t.Fatalf("decode didChangeWatchedFiles: %v", err)
				}
				changes = append(changes, params.Changes)
			}
			server.mu.Unlock()
			if len(changes) != 1 || !slices.Equal(changes[0], events) {
				t.Fatalf("%q got changes %+v, want one notification with %+v", key, changes, events)
			}
		}
	})
}
