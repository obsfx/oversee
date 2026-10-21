package httpapi

import (
	"net/http"
	"strconv"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

type definitionHandler struct {
	definitions *service.DefinitionService
}

func (h definitionHandler) find(w http.ResponseWriter, r *http.Request) {
	query, err := definitionQueryOf(r)
	if err != nil {
		respondError(w, err)
		return
	}
	lookup, err := h.definitions.Find(r.Context(), query)
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.DefinitionLookupOf(lookup))
}

func (h definitionHandler) fileContent(w http.ResponseWriter, r *http.Request) {
	values := r.URL.Query()
	request := domain.FileContentRequest{Path: values.Get("path")}
	if external := values.Get("external"); external != "" {
		request = domain.FileContentRequest{Path: external, External: true}
	}
	content, err := h.definitions.FileContent(request)
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.FileContentOf(content))
}

func definitionQueryOf(r *http.Request) (domain.DefinitionQuery, error) {
	values := r.URL.Query()
	line, err := strconv.Atoi(values.Get("line"))
	if err != nil {
		return domain.DefinitionQuery{}, domain.ValidationError{Field: "line", Reason: "must be a number"}
	}
	character, err := strconv.Atoi(values.Get("character"))
	if err != nil {
		return domain.DefinitionQuery{}, domain.ValidationError{Field: "character", Reason: "must be a number"}
	}
	return domain.DefinitionQuery{
		Comparison: comparisonOf(r),
		Side:       domain.FileSide(values.Get("side")),
		Path:       values.Get("path"),
		Line:       line,
		Character:  character,
	}, nil
}
