package domain

import "path/filepath"

type FileContentRequest struct {
	Path     string
	External bool
}

func (r FileContentRequest) Validate() error {
	if r.Path == "" {
		return r.Reject("is required")
	}
	if r.External {
		if !filepath.IsAbs(r.Path) {
			return r.Reject("must be an absolute path")
		}
		return nil
	}
	if problem := repoPathProblem(r.Path); problem != "" {
		return r.Reject(problem)
	}
	return nil
}

func (r FileContentRequest) Reject(reason string) error {
	if r.External {
		return invalid("external", reason)
	}
	return invalid("path", reason)
}

type FileContent struct {
	Path     string
	Contents Blob
}
