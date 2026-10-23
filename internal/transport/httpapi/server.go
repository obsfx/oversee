package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"sync"
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
	ctx, cancel := context.WithCancel(ctx)
	httpServer := &http.Server{
		Handler:           s.handler(),
		ReadHeaderTimeout: 10 * time.Second,
		BaseContext: func(net.Listener) context.Context {
			return ctx
		},
	}
	var background sync.WaitGroup
	background.Go(func() {
		if err := s.services.Events.Follow(ctx, s.hub.Publish); err != nil {
			slog.Error("event feed stopped", "error", err)
		}
	})
	background.Go(func() {
		s.services.Watcher.Follow(ctx, s.hub, s.hub.PublishWorkspaceChange)
	})
	background.Go(func() {
		s.services.LanguageServers.Follow(ctx, s.hub.PublishLanguageServersChange)
	})
	background.Go(func() {
		s.services.Flows.Follow(ctx, s.hub.PublishFlowProgress)
	})
	background.Go(func() {
		<-ctx.Done()
		shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancelShutdown()
		httpServer.Shutdown(shutdownCtx)
	})
	err := httpServer.Serve(listener)
	cancel()
	background.Wait()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (s *Server) handler() http.Handler {
	return localOnly(http.NewCrossOriginProtection().Handler(s.routes()))
}

func (s *Server) routes() http.Handler {
	diffs := diffHandler{diffs: s.services.Diffs}
	comments := commentHandler{comments: s.services.Comments}
	sessions := sessionHandler{reviews: s.services.Reviews}
	notifications := notificationHandler{notifications: s.services.Notifications}
	settings := settingsHandler{settings: s.services.Settings}
	languageServers := languageServerHandler{servers: s.services.LanguageServers}
	definitions := definitionHandler{definitions: s.services.Definitions}
	flows := changeFlowHandler{flows: s.services.Flows}
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
	mux.HandleFunc("GET /api/settings", settings.get)
	mux.HandleFunc("PATCH /api/settings", settings.update)
	mux.HandleFunc("GET /api/language-servers", languageServers.list)
	mux.HandleFunc("POST /api/language-servers/{id}/install", languageServers.install)
	mux.HandleFunc("DELETE /api/language-servers/{id}/install", languageServers.cancel)
	mux.HandleFunc("DELETE /api/language-servers/{id}", languageServers.uninstall)
	mux.HandleFunc("GET /api/definitions", sameOrigin(definitions.find))
	mux.HandleFunc("GET /api/file-content", sameOrigin(definitions.fileContent))
	mux.HandleFunc("GET /api/change-flow", sameOrigin(flows.get))
	mux.Handle("GET /ws", s.hub)
	mux.HandleFunc("GET /{$}", s.index.serve)
	return mux
}

func sameOrigin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Header.Get("Sec-Fetch-Site") {
		case "", "same-origin", "none":
			next(w, r)
		default:
			http.Error(w, "cross-origin request", http.StatusForbidden)
		}
	}
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
