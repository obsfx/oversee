package domain

import (
	"slices"
	"strings"
	"time"
)

type Side string

const (
	SideAdditions Side = "additions"
	SideDeletions Side = "deletions"
)

func (s Side) Valid() bool {
	return s == SideAdditions || s == SideDeletions
}

func (s Side) FileSide() FileSide {
	if s == SideDeletions {
		return FileSideOld
	}
	return FileSideNew
}

type LineRange struct {
	Start   int
	End     int
	Side    Side
	EndSide Side
}

func (r LineRange) Validate() error {
	if r.Start < 1 || r.End < r.Start {
		return invalid("range", "must start at line 1 or later and end at or after its start")
	}
	if !r.Side.Valid() || !r.EndSide.Valid() {
		return invalid("range", "sides must be additions or deletions")
	}
	return nil
}

func (r LineRange) SnapshotSide() FileSide {
	return r.EndSide.FileSide()
}

func (r LineRange) IsSingleSide() bool {
	return r.Side == r.EndSide
}

func (r LineRange) Shift(delta int) LineRange {
	r.Start += delta
	r.End += delta
	return r
}

func (r LineRange) Snapshot(blob Blob) []SnapshotLine {
	lines, readable := blob.Lines()
	if !readable {
		return []SnapshotLine{}
	}
	start := min(max(r.Start, 1), len(lines)+1)
	end := min(r.End, len(lines))
	snapshot := []SnapshotLine{}
	for number := start; number <= end; number++ {
		snapshot = append(snapshot, SnapshotLine{Number: number, Text: lines[number-1]})
	}
	return snapshot
}

type SnapshotLine struct {
	Number int
	Text   string
}

type snapshotText []string

func snapshotTextOf(lines []SnapshotLine) snapshotText {
	text := make(snapshotText, 0, len(lines))
	for _, line := range lines {
		text = append(text, line.Text)
	}
	return text
}

func (t snapshotText) matchesAt(lines []string, start int) bool {
	if start < 1 || start-1+len(t) > len(lines) {
		return false
	}
	return slices.Equal(lines[start-1:start-1+len(t)], []string(t))
}

func (t snapshotText) nearest(lines []string, origin int) (int, bool) {
	limit := max(origin-1, len(lines)-origin)
	for distance := 1; distance <= limit; distance++ {
		if t.matchesAt(lines, origin-distance) {
			return origin - distance, true
		}
		if t.matchesAt(lines, origin+distance) {
			return origin + distance, true
		}
	}
	return 0, false
}

type CommentDraft struct {
	FilePath      string
	PreviousPath  string
	Range         LineRange
	Body          string
	ExpectedLines []string
	VerifyLines   bool
}

func (d CommentDraft) Validate() error {
	if err := d.File().Validate(); err != nil {
		return err
	}
	if err := d.Range.Validate(); err != nil {
		return err
	}
	return ValidateBody(d.Body)
}

func (d CommentDraft) File() FileRef {
	return FileRef{Path: d.FilePath, PreviousPath: d.PreviousPath}
}

func (d CommentDraft) CheckFresh(snapshot []SnapshotLine) error {
	if !d.VerifyLines {
		return nil
	}
	matches := slices.EqualFunc(d.ExpectedLines, snapshot, func(text string, line SnapshotLine) bool {
		return text == line.Text
	})
	if !matches {
		return ErrStaleContent
	}
	return nil
}

func ValidateBody(body string) error {
	if strings.TrimSpace(body) == "" {
		return invalid("body", "is required")
	}
	return nil
}

type Comment struct {
	ID         string
	SessionID  string
	FilePath   string
	Range      LineRange
	Body       string
	Snapshot   []SnapshotLine
	CreatedAt  time.Time
	UpdatedAt  time.Time
	OutdatedAt time.Time
}

func NewComment(id, sessionID string, draft CommentDraft, snapshot []SnapshotLine, at time.Time) Comment {
	return Comment{
		ID:        id,
		SessionID: sessionID,
		FilePath:  draft.FilePath,
		Range:     draft.Range,
		Body:      draft.Body,
		Snapshot:  snapshot,
		CreatedAt: at,
		UpdatedAt: at,
	}
}

func (c Comment) IsOutdated() bool {
	return !c.OutdatedAt.IsZero()
}

type PlacementKind string

const (
	PlacementUnchanged PlacementKind = "unchanged"
	PlacementMoved     PlacementKind = "moved"
	PlacementOutdated  PlacementKind = "outdated"
)

type Placement struct {
	Kind  PlacementKind
	Moved Comment
}

func (c Comment) Place(blob Blob) Placement {
	current, found := c.locate(blob)
	if !found {
		return Placement{Kind: PlacementOutdated}
	}
	if current == c.Range {
		return Placement{Kind: PlacementUnchanged}
	}
	return Placement{Kind: PlacementMoved, Moved: c.moveTo(current)}
}

func (c Comment) locate(blob Blob) (LineRange, bool) {
	if len(c.Snapshot) == 0 {
		return c.Range, true
	}
	lines, readable := blob.Lines()
	if !readable {
		return LineRange{}, false
	}
	text := snapshotTextOf(c.Snapshot)
	origin := c.Snapshot[0].Number
	if text.matchesAt(lines, origin) {
		return c.Range, true
	}
	if !c.Range.IsSingleSide() {
		return LineRange{}, false
	}
	start, found := text.nearest(lines, origin)
	if !found {
		return LineRange{}, false
	}
	return c.Range.Shift(start - origin), true
}

func (c Comment) moveTo(to LineRange) Comment {
	delta := to.Start - c.Range.Start
	snapshot := make([]SnapshotLine, 0, len(c.Snapshot))
	for _, line := range c.Snapshot {
		snapshot = append(snapshot, SnapshotLine{Number: line.Number + delta, Text: line.Text})
	}
	c.Range = to
	c.Snapshot = snapshot
	return c
}

type ReplyDraft struct {
	CommentID string
	Author    string
	Body      string
}

func (d ReplyDraft) Validate() error {
	if d.CommentID == "" {
		return invalid("comment", "is required")
	}
	if strings.TrimSpace(d.Author) == "" {
		return invalid("author", "is required")
	}
	return ValidateBody(d.Body)
}

type Reply struct {
	ID        string
	CommentID string
	Author    string
	Body      string
	CreatedAt time.Time
}

func NewReply(id string, draft ReplyDraft, at time.Time) Reply {
	return Reply{
		ID:        id,
		CommentID: draft.CommentID,
		Author:    strings.TrimSpace(draft.Author),
		Body:      strings.TrimSpace(draft.Body),
		CreatedAt: at,
	}
}
