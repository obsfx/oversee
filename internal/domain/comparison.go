package domain

import (
	"path/filepath"
	"strings"
)

const UncommittedSource = ":uncommitted"

type Comparison struct {
	Source string
	Target string
}

func (c Comparison) Validate() error {
	if !isRef(c.Source) {
		return invalid("source", "must be a git ref")
	}
	if !isRef(c.Target) {
		return invalid("target", "must be a git ref")
	}
	return nil
}

func (c Comparison) IsUncommitted() bool {
	return c.Source == UncommittedSource
}

func (c Comparison) Refs() []string {
	if c.IsUncommitted() {
		return []string{c.Target}
	}
	return []string{c.Source, c.Target}
}

type FileSide string

const (
	FileSideOld FileSide = "old"
	FileSideNew FileSide = "new"
)

func (s FileSide) Validate() error {
	if s != FileSideOld && s != FileSideNew {
		return invalid("side", "must be old or new")
	}
	return nil
}

type FileRef struct {
	Path         string
	PreviousPath string
}

func (f FileRef) OldPath() string {
	if f.PreviousPath == "" {
		return f.Path
	}
	return f.PreviousPath
}

func (f FileRef) PathOn(side FileSide) string {
	if side == FileSideOld {
		return f.OldPath()
	}
	return f.Path
}

func (f FileRef) SnapshotPath(r LineRange) string {
	return f.PathOn(r.SnapshotSide())
}

func (f FileRef) Validate() error {
	if !isRepoPath(f.Path) {
		return invalid("path", "must be a path inside the repository")
	}
	if !isRepoPath(f.OldPath()) {
		return invalid("previousPath", "must be a path inside the repository")
	}
	return nil
}

func isRef(value string) bool {
	return value != "" && !strings.HasPrefix(value, "-")
}

func isRepoPath(value string) bool {
	return value != "" && !strings.HasPrefix(value, "-") && filepath.IsLocal(filepath.FromSlash(value))
}
