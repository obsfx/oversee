package httpapi

import (
	"net/http"

	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type settingsHandler struct {
	settings *service.SettingsService
}

func (h settingsHandler) get(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settings.All(r.Context())
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.SettingsOf(settings))
}

func (h settingsHandler) update(w http.ResponseWriter, r *http.Request) {
	request, ok := decode[dto.Settings](w, r)
	if !ok {
		return
	}
	if err := h.settings.Update(r.Context(), request.ToDomain()); err != nil {
		respondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
