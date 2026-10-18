package httpapi

import (
	"net/http"

	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type notificationHandler struct {
	notifications *service.NotificationService
}

func (h notificationHandler) list(w http.ResponseWriter, r *http.Request) {
	notifications, err := h.notifications.List(r.Context())
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.NotificationListOf(notifications))
}

func (h notificationHandler) markRead(w http.ResponseWriter, r *http.Request) {
	request, ok := decode[dto.ReadNotificationsRequest](w, r)
	if !ok {
		return
	}
	if err := h.notifications.MarkRead(r.Context(), request.IDs); err != nil {
		respondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
