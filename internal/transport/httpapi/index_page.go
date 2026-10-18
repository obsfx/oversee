package httpapi

import (
	"bytes"
	"encoding/json/v2"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/transport/dto"
	"github.com/obsfx/oversee/internal/webui"
)

type indexPage struct {
	workspaceInfo dto.Workspace
	pages         pageCache
}

func newIndexPage(workspace domain.WorkspaceInfo) *indexPage {
	return &indexPage{workspaceInfo: dto.WorkspaceOf(workspace)}
}

func (p *indexPage) workspace(w http.ResponseWriter, _ *http.Request) {
	respond(w, http.StatusOK, p.workspaceInfo)
}

func (p *indexPage) serve(w http.ResponseWriter, r *http.Request) {
	page, err := p.pages.get(r.Host, func() ([]byte, error) {
		return p.render(r.Host)
	})
	if errors.Is(err, webui.ErrNotBuilt) {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	if err != nil {
		slog.Error("ui shell render failed", "error", err)
		http.Error(w, "ui shell unavailable", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Vary", "Accept-Encoding")
	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		w.Header().Set("Content-Encoding", "gzip")
		w.Write(page.gzipped)
		return
	}
	w.Write(page.raw)
}

func (p *indexPage) render(host string) ([]byte, error) {
	page, err := webui.Index()
	if err != nil {
		return nil, err
	}
	script, err := p.globalsScript(host)
	if err != nil {
		return nil, err
	}
	return bytes.Replace(page, []byte("<head>"), append([]byte("<head>"), script...), 1), nil
}

func (p *indexPage) globalsScript(host string) ([]byte, error) {
	encoded, err := json.Marshal(dto.Globals{
		BaseURL:   "http://" + host,
		WSURL:     "ws://" + host + "/ws",
		Workspace: p.workspaceInfo,
	})
	if err != nil {
		return nil, err
	}
	safe := strings.ReplaceAll(string(encoded), "</", `<\/`)
	return fmt.Appendf(nil, "<script>window.__overseeGlobal=%s</script>", safe), nil
}
