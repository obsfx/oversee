package dto

import "github.com/obsfx/oversee/internal/domain"

type FileContent struct {
	Path     string `json:"path"`
	Contents string `json:"contents"`
}

func FileContentOf(content domain.FileContent) FileContent {
	return FileContent{Path: content.Path, Contents: string(content.Contents)}
}
