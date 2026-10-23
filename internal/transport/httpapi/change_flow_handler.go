package httpapi

import (
	"net/http"

	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type changeFlowHandler struct {
	flows *service.ChangeFlowService
}

func (h changeFlowHandler) get(w http.ResponseWriter, r *http.Request) {
	graph, err := h.flows.Flow(r.Context(), comparisonOf(r))
	if r.Context().Err() != nil {
		return
	}
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.ChangeFlowOf(graph))
}
