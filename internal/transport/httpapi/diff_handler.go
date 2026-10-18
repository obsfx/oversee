package httpapi

import (
	"net/http"
	"path"
	"strings"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/service"
	"github.com/obsfx/oversee/internal/transport/dto"
)

var imageTypes = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".webp": "image/webp",
	".ico":  "image/x-icon",
	".bmp":  "image/bmp",
	".avif": "image/avif",
}

type diffHandler struct {
	diffs *service.DiffService
}

func (h diffHandler) branches(w http.ResponseWriter, r *http.Request) {
	branches, err := h.diffs.Branches(r.Context())
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.BranchListOf(branches))
}

func (h diffHandler) tree(w http.ResponseWriter, r *http.Request) {
	tree, err := h.diffs.Tree(r.Context(), comparisonOf(r))
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.FileTreeOf(tree))
}

func (h diffHandler) fileDiff(w http.ResponseWriter, r *http.Request) {
	diff, err := h.diffs.FileDiff(r.Context(), comparisonOf(r), fileRefOf(r))
	if err != nil {
		respondError(w, err)
		return
	}
	respond(w, http.StatusOK, dto.FileDiffOf(diff))
}

func (h diffHandler) blob(w http.ResponseWriter, r *http.Request) {
	file := fileRefOf(r)
	side := domain.FileSide(r.URL.Query().Get("side"))
	contentType, isImage := imageTypes[strings.ToLower(path.Ext(file.PathOn(side)))]
	if !isImage {
		respond(w, http.StatusUnsupportedMediaType, dto.Error{Error: "only image files can be served"})
		return
	}
	blob, err := h.diffs.Blob(r.Context(), comparisonOf(r), file, side)
	if err != nil {
		respondError(w, err)
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-cache")
	w.Write(blob)
}
