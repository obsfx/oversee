package httpapi

import (
	"bytes"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/obsfx/oversee/internal/domain"
)

type logBuffer struct {
	mu     sync.Mutex
	buffer bytes.Buffer
}

func (b *logBuffer) Write(chunk []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buffer.Write(chunk)
}

func (b *logBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buffer.String()
}

func captureLogs(t *testing.T) *logBuffer {
	t.Helper()
	previous := slog.Default()
	logs := &logBuffer{}
	slog.SetDefault(slog.New(slog.NewTextHandler(logs, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previous)
	})
	return logs
}

func TestStatusOf(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{name: "validation error", err: domain.ValidationError{Field: "line", Reason: "must be a number"}, want: http.StatusBadRequest},
		{name: "wrapped validation error", err: fmt.Errorf("query: %w", domain.ValidationError{Field: "path", Reason: "is required"}), want: http.StatusBadRequest},
		{name: "not found", err: fmt.Errorf("comment c1: %w", domain.ErrNotFound), want: http.StatusNotFound},
		{name: "no open session", err: fmt.Errorf("finish: %w", domain.ErrNoOpenSession), want: http.StatusNotFound},
		{name: "unknown branch", err: fmt.Errorf("resolve feature: %w", domain.ErrUnknownBranch), want: http.StatusNotFound},
		{name: "joined not found", err: errors.Join(errors.New("read"), domain.ErrNotFound), want: http.StatusNotFound},
		{name: "session finished", err: domain.ErrSessionFinished, want: http.StatusConflict},
		{name: "session not finished", err: domain.ErrSessionNotFinished, want: http.StatusConflict},
		{name: "stale content", err: fmt.Errorf("comment: %w", domain.ErrStaleContent), want: http.StatusConflict},
		{name: "language server unavailable", err: fmt.Errorf("%w: zls has no build for this platform", domain.ErrLanguageServerUnavailable), want: http.StatusConflict},
		{name: "language server busy", err: fmt.Errorf("%w: gopls", domain.ErrLanguageServerBusy), want: http.StatusConflict},
		{name: "anything else", err: errors.New("database is locked"), want: http.StatusInternalServerError},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := statusOf(test.err); got != test.want {
				t.Errorf("statusOf(%v) = %d, want %d", test.err, got, test.want)
			}
		})
	}
}

func TestRespondError(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantBody   string
		wantLogged bool
	}{
		{name: "client error", err: domain.ValidationError{Field: "path", Reason: "is required"}, wantStatus: http.StatusBadRequest, wantBody: `{"error":"path is required"}`},
		{name: "not found", err: fmt.Errorf("file a.go: %w", domain.ErrNotFound), wantStatus: http.StatusNotFound, wantBody: `{"error":"file a.go: not found"}`},
		{name: "conflict", err: fmt.Errorf("%w: gopls", domain.ErrLanguageServerBusy), wantStatus: http.StatusConflict, wantBody: `{"error":"language server is busy: gopls"}`},
		{name: "server error", err: errors.New("database is locked"), wantStatus: http.StatusInternalServerError, wantBody: `{"error":"database is locked"}`, wantLogged: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			logs := captureLogs(t)
			recorder := httptest.NewRecorder()
			respondError(recorder, test.err)
			if recorder.Code != test.wantStatus {
				t.Errorf("status = %d, want %d", recorder.Code, test.wantStatus)
			}
			if contentType := recorder.Header().Get("Content-Type"); contentType != "application/json" {
				t.Errorf("Content-Type = %q", contentType)
			}
			if body := strings.TrimSpace(recorder.Body.String()); body != test.wantBody {
				t.Errorf("body = %s, want %s", body, test.wantBody)
			}
			if !test.wantLogged {
				if logs.String() != "" {
					t.Errorf("logs = %q, want nothing for a client error", logs.String())
				}
				return
			}
			if !strings.Contains(logs.String(), `level=ERROR msg="request failed"`) || !strings.Contains(logs.String(), test.err.Error()) {
				t.Errorf("logs = %q, want the failure logged as an error", logs.String())
			}
		})
	}
}
