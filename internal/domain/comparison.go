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

func (c Comparison) OnWorkingTree(currentBranch string) bool {
	return c.IsUncommitted() || c.Source == currentBranch
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
	if problem := repoPathProblem(f.Path); problem != "" {
		return invalid("path", problem)
	}
	if problem := repoPathProblem(f.OldPath()); problem != "" {
		return invalid("previousPath", problem)
	}
	return nil
}

func isRef(value string) bool {
	return value != "" && !strings.HasPrefix(value, "-")
}

func repoPathProblem(value string) string {
	switch {
	case value == "":
		return "is required"
	case strings.HasPrefix(value, "-"):
		return "must not start with -"
	case !filepath.IsLocal(filepath.FromSlash(value)):
		return "must stay inside the repository"
	default:
		return ""
	}
}
