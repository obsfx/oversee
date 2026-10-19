package httpapi

import (
	"encoding/json/v2"
	"errors"
	"log/slog"
	"net/http"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/transport/dto"
)

const maxBodyBytes = 1 << 20

func respond(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.MarshalWrite(w, body); err != nil {
		slog.Warn("response encode failed", "error", err)
	}
}

func respondError(w http.ResponseWriter, err error) {
	status := statusOf(err)
	if status == http.StatusInternalServerError {
		slog.Error("request failed", "error", err)
	}
	respond(w, status, dto.Error{Error: err.Error()})
}

func statusOf(err error) int {
	if _, ok := errors.AsType[domain.ValidationError](err); ok {
		return http.StatusBadRequest
	}
	switch {
	case errors.Is(err, domain.ErrNotFound), errors.Is(err, domain.ErrNoOpenSession):
		return http.StatusNotFound
	case errors.Is(err, domain.ErrSessionFinished),
		errors.Is(err, domain.ErrSessionNotFinished),
		errors.Is(err, domain.ErrStaleContent):
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

func decode[T any](w http.ResponseWriter, r *http.Request) (T, bool) {
	var body T
	if err := json.UnmarshalRead(http.MaxBytesReader(w, r.Body, maxBodyBytes), &body); err != nil {
		respond(w, http.StatusBadRequest, dto.Error{Error: "invalid json body"})
		return body, false
	}
	return body, true
}

func comparisonOf(r *http.Request) domain.Comparison {
	query := r.URL.Query()
	return domain.Comparison{Source: query.Get("source"), Target: query.Get("target")}
}

func fileRefOf(r *http.Request) domain.FileRef {
	query := r.URL.Query()
	return domain.FileRef{Path: query.Get("path"), PreviousPath: query.Get("previousPath")}
}
