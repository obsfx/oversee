package domain

import "slices"

type LineSpan struct {
	Start int
	End   int
}

type LineHunk struct {
	OldStart int
	OldLines int
	NewStart int
	NewLines int
}

func (h LineHunk) touches(side FileSide, span LineSpan) bool {
	start, count := h.NewStart, h.NewLines
	if side == FileSideOld {
		start, count = h.OldStart, h.OldLines
	}
	if count == 0 {
		return span.Start <= start && start < span.End
	}
	return start <= span.End && start+count-1 >= span.Start
}

type LineChanges struct {
	Path         string
	PreviousPath string
	Status       ChangeStatus
	Hunks        []LineHunk
}

func (c LineChanges) File() FileRef {
	return FileRef{Path: c.Path, PreviousPath: c.PreviousPath}
}

func (c LineChanges) Touches(side FileSide, span LineSpan) bool {
	if c.Status == ChangeUntracked {
		return side == FileSideNew
	}
	return slices.ContainsFunc(c.Hunks, func(hunk LineHunk) bool {
		return hunk.touches(side, span)
	})
}

func (c LineChanges) adds(span LineSpan) bool {
	if !c.HasSide(FileSideOld) {
		return true
	}
	covered := span.Start
	for _, hunk := range c.Hunks {
		if hunk.NewLines > 0 && hunk.NewStart <= covered {
			covered = max(covered, hunk.NewStart+hunk.NewLines)
		}
	}
	return covered > span.End
}

func (c LineChanges) HasSide(side FileSide) bool {
	if side == FileSideOld {
		return c.Status != ChangeAdded && c.Status != ChangeUntracked
	}
	return c.Status != ChangeDeleted
}

func (c LineChanges) RemovesLines() bool {
	if c.Status == ChangeDeleted {
		return true
	}
	return c.HasSide(FileSideOld) && slices.ContainsFunc(c.Hunks, func(hunk LineHunk) bool {
		return hunk.OldLines > 0
	})
}

func (c LineChanges) Opens(side FileSide) bool {
	return c.HasSide(side) && (side == FileSideNew || c.RemovesLines())
}

func WholeFileAdded(path string) LineChanges {
	return LineChanges{Path: path, Status: ChangeUntracked}
}
