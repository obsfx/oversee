package httpapi

import (
	"net/http"

	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type commentHandler struct {
	comments *service.CommentService
}

func (h commentHandler) list(w http.ResponseWriter, r *http.Request) {
	comments, err := h.comments.Active(r.Context(), comparisonOf(r))
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.CommentList{Comments: dto.CommentsOf(comments)})
}

func (h commentHandler) create(w http.ResponseWriter, r *http.Request) {
	request, ok := decode[dto.CreateCommentRequest](w, r)
	if !ok {
		return
	}
	comparison, draft := request.ToDomain()
	comment, err := h.comments.Create(r.Context(), comparison, draft)
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusCreated, dto.CommentBody{Comment: dto.CommentOf(comment)})
}

func (h commentHandler) update(w http.ResponseWriter, r *http.Request) {
	request, ok := decode[dto.UpdateCommentRequest](w, r)
	if !ok {
		return
	}
	comment, err := h.comments.Update(r.Context(), r.PathValue("id"), request.Body)
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.CommentBody{Comment: dto.CommentOf(comment)})
}

func (h commentHandler) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.comments.Delete(r.Context(), r.PathValue("id")); err != nil {
		respondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
