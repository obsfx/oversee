package ws_test

import (
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/transport/ws"
)

type backlogEvents struct {
	backlog []domain.RecordedEvent
}

func (e backlogEvents) LatestID(context.Context) (int64, error) {
	return 0, nil
}

func (e backlogEvents) After(_ context.Context, id int64) ([]domain.RecordedEvent, error) {
	var events []domain.RecordedEvent
	for _, event := range e.backlog {
		if event.ID > id {
			events = append(events, event)
		}
	}
	return events, nil
}

func connect(t *testing.T, hub *ws.Hub) *websocket.Conn {
	t.Helper()
	server := httptest.NewServer(hub)
	t.Cleanup(server.Close)
	conn, _, err := websocket.Dial(t.Context(), "ws"+strings.TrimPrefix(server.URL, "http"), nil)
	if err != nil {
		t.Fatalf("dial hub: %v", err)
	}
	t.Cleanup(func() {
		conn.CloseNow()
	})
	return conn
}

func readEnvelope(t *testing.T, conn *websocket.Conn) map[string]jsontext.Value {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	defer cancel()
	kind, message, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("read envelope: %v", err)
	}
	if kind != websocket.MessageText {
		t.Fatalf("message type = %v, want text", kind)
	}
	var envelope map[string]jsontext.Value
	if err := json.Unmarshal(message, &envelope); err != nil {
		t.Fatalf("decode envelope %s: %v", message, err)
	}
	return envelope
}

func TestHubPublishesFlowProgressToConnectedClients(t *testing.T) {
	replayed := domain.RecordedEvent{ID: 1, Kind: domain.EventNotificationsRead, Payload: []byte(`{"ids":[1]}`), CreatedAt: time.UnixMilli(1)}
	hub := ws.NewHub(backlogEvents{backlog: []domain.RecordedEvent{replayed}}, nil)
	conn := connect(t, hub)
	if envelope := readEnvelope(t, conn); string(envelope["kind"]) != `"notifications.read"` {
		t.Fatalf("first envelope kind = %s, want the replayed backlog", envelope["kind"])
	}

	hub.PublishFlowProgress(domain.FlowProgress{
		Comparison: domain.Comparison{Source: domain.UncommittedSource, Target: "main"},
		Servers: []domain.FlowServerProgress{
			{Server: "gdscript", Phase: domain.FlowPhaseStarting},
			{Server: "tsls", Phase: domain.FlowPhaseTracing, Done: 3, Total: 7},
		},
	})

	envelope := readEnvelope(t, conn)
	if id, found := envelope["id"]; found {
		t.Errorf("id = %s, want a signal without an id", id)
	}
	if kind := string(envelope["kind"]); kind != `"change-flow.progress"` {
		t.Errorf("kind = %s, want \"change-flow.progress\"", kind)
	}
	wantPayload := `{"comparison":{"source":":uncommitted","target":"main"},"servers":[{"server":"gdscript","phase":"starting","done":0,"total":0},{"server":"tsls","phase":"tracing","done":3,"total":7}]}`
	if payload := string(envelope["payload"]); payload != wantPayload {
		t.Errorf("payload\n got: %s\nwant: %s", payload, wantPayload)
	}
	var createdAt int64
	if err := json.Unmarshal(envelope["createdAt"], &createdAt); err != nil || createdAt <= 0 {
		t.Errorf("createdAt = %s, want the send time in milliseconds", envelope["createdAt"])
	}
}
