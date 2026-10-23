package ws

import (
	"context"
	"encoding/json/v2"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/coder/websocket"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/transport/dto"
)

const clientBuffer = 256

type EventSource interface {
	LatestID(ctx context.Context) (int64, error)
	After(ctx context.Context, id int64) ([]domain.RecordedEvent, error)
}

type client struct {
	send chan dto.Envelope
}

type Hub struct {
	events         EventSource
	originPatterns []string
	mu             sync.Mutex
	clients        map[*client]struct{}
}

func NewHub(events EventSource, originPatterns []string) *Hub {
	return &Hub{events: events, originPatterns: originPatterns, clients: map[*client]struct{}{}}
}

func (h *Hub) Publish(events []domain.RecordedEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, event := range events {
		h.broadcast(dto.EnvelopeOf(event))
	}
}

func (h *Hub) PublishWorkspaceChange(change domain.WorkspaceChange) {
	h.publishSignal(dto.WorkspaceChangedOf(change, time.Now()))
}

func (h *Hub) PublishLanguageServersChange() {
	h.publishSignal(dto.LanguageServersChangedOf(time.Now()))
}

func (h *Hub) PublishFlowProgress(progress domain.FlowProgress) {
	h.publishSignal(dto.FlowProgressOf(progress, time.Now()))
}

func (h *Hub) publishSignal(envelope dto.Envelope, err error) {
	if err != nil {
		slog.Warn("signal encoding failed", "error", err)
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.broadcast(envelope)
}

func (h *Hub) HasClients() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.clients) > 0
}

func (h *Hub) broadcast(envelope dto.Envelope) {
	for c := range h.clients {
		select {
		case c.send <- envelope:
		default:
			h.drop(c)
		}
	}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: h.originPatterns})
	if err != nil {
		return
	}
	defer conn.CloseNow()
	ctx := conn.CloseRead(r.Context())
	c := h.subscribe()
	defer h.unsubscribe(c)
	after, err := h.cursor(ctx, r)
	if err != nil {
		conn.Close(websocket.StatusInternalError, "event cursor unavailable")
		return
	}
	after, err = h.replay(ctx, conn, after)
	if err != nil {
		return
	}
	h.stream(ctx, conn, c, after)
}

func (h *Hub) replay(ctx context.Context, conn *websocket.Conn, after int64) (int64, error) {
	backlog, err := h.events.After(ctx, after)
	if err != nil {
		conn.Close(websocket.StatusInternalError, "event replay failed")
		return after, err
	}
	for _, event := range backlog {
		if err := write(ctx, conn, dto.EnvelopeOf(event)); err != nil {
			return after, err
		}
		after = event.ID
	}
	return after, nil
}

func (h *Hub) stream(ctx context.Context, conn *websocket.Conn, c *client, after int64) {
	for {
		select {
		case <-ctx.Done():
			return
		case envelope, open := <-c.send:
			if !open {
				conn.Close(websocket.StatusPolicyViolation, "client fell behind")
				return
			}
			if envelope.Replayable() && envelope.ID <= after {
				continue
			}
			if err := write(ctx, conn, envelope); err != nil {
				slog.Debug("websocket write failed", "error", err)
				return
			}
			if envelope.Replayable() {
				after = envelope.ID
			}
		}
	}
}

func (h *Hub) cursor(ctx context.Context, r *http.Request) (int64, error) {
	if after, err := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64); err == nil && after >= 0 {
		return after, nil
	}
	return h.events.LatestID(ctx)
}

func (h *Hub) subscribe() *client {
	c := &client{send: make(chan dto.Envelope, clientBuffer)}
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	return c
}

func (h *Hub) unsubscribe(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.drop(c)
}

func (h *Hub) drop(c *client) {
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
}

func write(ctx context.Context, conn *websocket.Conn, envelope dto.Envelope) error {
	encoded, err := json.Marshal(envelope)
	if err != nil {
		return err
	}
	return conn.Write(ctx, websocket.MessageText, encoded)
}
