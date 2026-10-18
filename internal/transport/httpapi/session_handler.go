package httpapi

import (
	"net/http"

	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type sessionHandler struct {
	reviews *service.ReviewService
}

func (h sessionHandler) list(w http.ResponseWriter, r *http.Request) {
	details, err := h.reviews.FinishedFor(r.Context(), comparisonOf(r))
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.SessionList{Sessions: dto.SessionsOf(details)})
}

func (h sessionHandler) get(w http.ResponseWriter, r *http.Request) {
	detail, err := h.reviews.Detail(r.Context(), r.PathValue("id"))
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.SessionBody{Session: dto.SessionOf(detail)})
}

func (h sessionHandler) finish(w http.ResponseWriter, r *http.Request) {
	request, ok := decode[dto.Comparison](w, r)
	if !ok {
		return
	}
	detail, err := h.reviews.Finish(r.Context(), request.ToDomain())
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.SessionBody{Session: dto.SessionOf(detail)})
}
