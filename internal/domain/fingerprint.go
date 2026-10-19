package domain

import (
	"maps"
	"slices"
	"time"
)

type PathState struct {
	Record  string
	Exists  bool
	Size    int64
	ModTime time.Time
}

func (s PathState) Equal(other PathState) bool {
	return s.Record == other.Record &&
		s.Exists == other.Exists &&
		s.Size == other.Size &&
		s.ModTime.Equal(other.ModTime)
}

type WorkspaceFingerprint struct {
	Head                string
	Branch              string
	Refs                map[string]string
	Worktree            map[string]PathState
	OperationInProgress bool
}

func (f WorkspaceFingerprint) ChangesSince(previous WorkspaceFingerprint) WorkspaceChange {
	paths := []string{}
	for path, state := range f.Worktree {
		if before, tracked := previous.Worktree[path]; !tracked || !state.Equal(before) {
			paths = append(paths, path)
		}
	}
	for path := range previous.Worktree {
		if _, tracked := f.Worktree[path]; !tracked {
			paths = append(paths, path)
		}
	}
	slices.Sort(paths)
	return WorkspaceChange{
		Paths:       paths,
		RefsChanged: f.Head != previous.Head || f.Branch != previous.Branch || !maps.Equal(f.Refs, previous.Refs),
	}
}

type WorkspaceChange struct {
	Paths       []string
	RefsChanged bool
}

func (c WorkspaceChange) IsEmpty() bool {
	return len(c.Paths) == 0 && !c.RefsChanged
}

func (c WorkspaceChange) Touches(comparison Comparison, path string) bool {
	if c.RefsChanged {
		return true
	}
	if !comparison.IsUncommitted() {
		return false
	}
	return slices.Contains(c.Paths, path)
}
