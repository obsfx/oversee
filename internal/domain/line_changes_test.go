package domain

import "testing"

func TestLineChangesTouches(t *testing.T) {
	cases := []struct {
		name  string
		hunks []LineHunk
		side  FileSide
		span  LineSpan
		want  bool
	}{
		{name: "span before a changed range", hunks: []LineHunk{hunkOf(3, 2, 3, 2)}, side: FileSideNew, span: LineSpan{1, 2}, want: false},
		{name: "span ending on the first changed line", hunks: []LineHunk{hunkOf(3, 2, 3, 2)}, side: FileSideNew, span: LineSpan{1, 3}, want: true},
		{name: "span starting on the last changed line", hunks: []LineHunk{hunkOf(3, 2, 3, 2)}, side: FileSideNew, span: LineSpan{4, 10}, want: true},
		{name: "span after a changed range", hunks: []LineHunk{hunkOf(3, 2, 3, 2)}, side: FileSideNew, span: LineSpan{5, 10}, want: false},
		{name: "span inside a changed range", hunks: []LineHunk{hunkOf(2, 10, 2, 10)}, side: FileSideNew, span: LineSpan{4, 6}, want: true},
		{name: "old side reads old line numbers", hunks: []LineHunk{hunkOf(10, 3, 4, 1)}, side: FileSideOld, span: LineSpan{11, 11}, want: true},
		{name: "new side ignores old line numbers", hunks: []LineHunk{hunkOf(10, 3, 4, 1)}, side: FileSideNew, span: LineSpan{11, 11}, want: false},
		{name: "new side reads new line numbers", hunks: []LineHunk{hunkOf(10, 3, 4, 1)}, side: FileSideNew, span: LineSpan{4, 4}, want: true},
		{name: "old side ignores new line numbers", hunks: []LineHunk{hunkOf(10, 3, 4, 1)}, side: FileSideOld, span: LineSpan{4, 4}, want: false},
		{name: "deletion inside a span touches it on the new side", hunks: []LineHunk{hunkOf(5, 2, 4, 0)}, side: FileSideNew, span: LineSpan{2, 6}, want: true},
		{name: "deletion after the first line of a span touches it", hunks: []LineHunk{hunkOf(5, 2, 4, 0)}, side: FileSideNew, span: LineSpan{4, 5}, want: true},
		{name: "deletion right after a span does not touch it", hunks: []LineHunk{hunkOf(5, 2, 4, 0)}, side: FileSideNew, span: LineSpan{2, 4}, want: false},
		{name: "deletion right before a span does not touch it", hunks: []LineHunk{hunkOf(5, 2, 4, 0)}, side: FileSideNew, span: LineSpan{5, 9}, want: false},
		{name: "deletion at the top of the file does not touch the first span", hunks: []LineHunk{hunkOf(1, 2, 0, 0)}, side: FileSideNew, span: LineSpan{1, 3}, want: false},
		{name: "deletion touches the old lines it removes", hunks: []LineHunk{hunkOf(5, 2, 4, 0)}, side: FileSideOld, span: LineSpan{6, 9}, want: true},
		{name: "insertion inside a span touches it on the old side", hunks: []LineHunk{hunkOf(2, 0, 3, 2)}, side: FileSideOld, span: LineSpan{1, 5}, want: true},
		{name: "insertion right after a span does not touch it on the old side", hunks: []LineHunk{hunkOf(2, 0, 3, 2)}, side: FileSideOld, span: LineSpan{1, 2}, want: false},
		{name: "insertion right before a span does not touch it on the old side", hunks: []LineHunk{hunkOf(2, 0, 3, 2)}, side: FileSideOld, span: LineSpan{3, 5}, want: false},
		{name: "insertion touches the new lines it adds", hunks: []LineHunk{hunkOf(2, 0, 3, 2)}, side: FileSideNew, span: LineSpan{4, 8}, want: true},
		{name: "any hunk can touch the span", hunks: []LineHunk{hunkOf(1, 1, 1, 1), hunkOf(20, 1, 20, 1)}, side: FileSideNew, span: LineSpan{18, 22}, want: true},
		{name: "spans between hunks are not touched", hunks: []LineHunk{hunkOf(1, 1, 1, 1), hunkOf(20, 1, 20, 1)}, side: FileSideNew, span: LineSpan{5, 15}, want: false},
		{name: "no hunks touch nothing", hunks: nil, side: FileSideNew, span: LineSpan{1, 100}, want: false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			changes := LineChanges{Path: "app.ts", Status: ChangeModified, Hunks: c.hunks}
			if got := changes.Touches(c.side, c.span); got != c.want {
				t.Errorf("Touches(%s, %+v) with %+v = %t, want %t", c.side, c.span, c.hunks, got, c.want)
			}
		})
	}
}

func TestLineChangesHasSide(t *testing.T) {
	cases := []struct {
		status  ChangeStatus
		wantOld bool
		wantNew bool
	}{
		{status: ChangeAdded, wantOld: false, wantNew: true},
		{status: ChangeUntracked, wantOld: false, wantNew: true},
		{status: ChangeDeleted, wantOld: true, wantNew: false},
		{status: ChangeModified, wantOld: true, wantNew: true},
		{status: ChangeRenamed, wantOld: true, wantNew: true},
	}
	for _, c := range cases {
		t.Run(string(c.status), func(t *testing.T) {
			changes := LineChanges{Path: "app.ts", Status: c.status}
			if got := changes.HasSide(FileSideOld); got != c.wantOld {
				t.Errorf("HasSide(old) = %t, want %t", got, c.wantOld)
			}
			if got := changes.HasSide(FileSideNew); got != c.wantNew {
				t.Errorf("HasSide(new) = %t, want %t", got, c.wantNew)
			}
		})
	}
}

func TestWholeFileAdded(t *testing.T) {
	changes := WholeFileAdded("src/new.ts")
	if changes.Path != "src/new.ts" || changes.PreviousPath != "" || changes.Status != ChangeUntracked {
		t.Errorf("WholeFileAdded = %+v, want an untracked src/new.ts", changes)
	}
	if changes.HasSide(FileSideOld) {
		t.Error("WholeFileAdded has an old side")
	}
}

func TestWholeFileAddedTouchesEveryNewLine(t *testing.T) {
	changes := WholeFileAdded("src/new.ts")
	if !changes.Touches(FileSideNew, LineSpan{1, 3}) || !changes.Touches(FileSideNew, LineSpan{400, 900}) {
		t.Error("a span on the new side is not touched")
	}
	if changes.Touches(FileSideOld, LineSpan{1, 3}) {
		t.Error("the old side is touched")
	}
}

func hunkOf(oldStart, oldLines, newStart, newLines int) LineHunk {
	return LineHunk{OldStart: oldStart, OldLines: oldLines, NewStart: newStart, NewLines: newLines}
}
