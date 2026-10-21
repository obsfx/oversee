package service

import "sync"

const externalPathLimit = 512

type externalPaths struct {
	mu    sync.Mutex
	order []string
	known map[string]bool
}

func (e *externalPaths) add(path string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.known[path] {
		return
	}
	if e.known == nil {
		e.known = map[string]bool{}
	}
	e.known[path] = true
	e.order = append(e.order, path)
	if len(e.order) > externalPathLimit {
		delete(e.known, e.order[0])
		e.order = e.order[1:]
	}
}

func (e *externalPaths) has(path string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.known[path]
}
