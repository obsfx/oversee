package httpapi

import (
	"net/http"

	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type languageServerHandler struct {
	servers *service.LanguageServerService
}

func (h languageServerHandler) list(w http.ResponseWriter, r *http.Request) {
	list, err := h.servers.List(r.Context())
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.LanguageServerListOf(list))
}

func (h languageServerHandler) install(w http.ResponseWriter, r *http.Request) {
	entry, started, err := h.servers.Install(r.Context(), r.PathValue("id"))
	if err != nil {
		respondError(w, err)
		return
	}
	status := http.StatusOK
	if started {
		status = http.StatusAccepted
	}
	respond(w, status, dto.LanguageServerOf(entry))
}

func (h languageServerHandler) uninstall(w http.ResponseWriter, r *http.Request) {
	if err := h.servers.Uninstall(r.Context(), r.PathValue("id")); err != nil {
		respondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
