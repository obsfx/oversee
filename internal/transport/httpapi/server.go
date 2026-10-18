package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/ws"
)

const shutdownTimeout = 3 * time.Second

var devOriginPatterns = []string{"localhost:*", "127.0.0.1:*"}

type Config struct {
	Services  service.Services
	Workspace domain.WorkspaceInfo
	Dev       bool
}

type Server struct {
	services service.Services
	hub      *ws.Hub
	index    *indexPage
}

func New(config Config) *Server {
	origins := []string{}
	if config.Dev {
		origins = devOriginPatterns
	}
	return &Server{
		services: config.Services,
		hub:      ws.NewHub(config.Services.Events, origins),
		index:    newIndexPage(config.Workspace),
	}
}

func (s *Server) Serve(ctx context.Context, listener net.Listener) error {
	httpServer := &http.Server{
		Handler:           localOnly(s.routes()),
		ReadHeaderTimeout: 10 * time.Second,
		BaseContext: func(net.Listener) context.Context {
			return ctx
		},
	}
	go func() {
		if err := s.services.Events.Follow(ctx, s.hub.Publish); err != nil {
			slog.Error("event feed stopped", "error", err)
		}
	}()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		httpServer.Shutdown(shutdownCtx)
	}()
	err := httpServer.Serve(listener)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (s *Server) routes() http.Handler {
	diffs := diffHandler{diffs: s.services.Diffs}
	comments := commentHandler{comments: s.services.Comments}
	sessions := sessionHandler{reviews: s.services.Reviews}
	notifications := notificationHandler{notifications: s.services.Notifications}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/workspace", s.index.workspace)
	mux.HandleFunc("GET /api/branches", diffs.branches)
	mux.HandleFunc("GET /api/file-tree", diffs.tree)
	mux.HandleFunc("GET /api/file-diff", diffs.fileDiff)
	mux.HandleFunc("GET /api/file-blob", diffs.blob)
	mux.HandleFunc("GET /api/comments", comments.list)
	mux.HandleFunc("POST /api/comments", comments.create)
	mux.HandleFunc("PATCH /api/comments/{id}", comments.update)
	mux.HandleFunc("DELETE /api/comments/{id}", comments.delete)
	mux.HandleFunc("GET /api/review-sessions", sessions.list)
	mux.HandleFunc("GET /api/review-sessions/{id}", sessions.get)
	mux.HandleFunc("POST /api/review-sessions/finish", sessions.finish)
	mux.HandleFunc("GET /api/notifications", notifications.list)
	mux.HandleFunc("POST /api/notifications/read", notifications.markRead)
	mux.Handle("GET /ws", s.hub)
	mux.HandleFunc("GET /{$}", s.index.serve)
	return mux
}

func localOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.Host)
		if err != nil {
			host = r.Host
		}
		if host != "localhost" && host != "127.0.0.1" && host != "::1" {
			http.Error(w, "forbidden host", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
