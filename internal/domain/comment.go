package domain

import (
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

func (r LineRange) Snapshot(blob Blob) []SnapshotLine {
	if !blob.Exists() || blob.IsBinary() {
		return []SnapshotLine{}
	}
	lines := strings.Split(string(blob), "\n")
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

type CommentDraft struct {
	FilePath string
	Range    LineRange
	Body     string
}

func (d CommentDraft) Validate() error {
	if err := (FileRef{Path: d.FilePath}).Validate(); err != nil {
		return err
	}
	if err := d.Range.Validate(); err != nil {
		return err
	}
	return ValidateBody(d.Body)
}

func ValidateBody(body string) error {
	if strings.TrimSpace(body) == "" {
		return invalid("body", "is required")
	}
	return nil
}

type Comment struct {
	ID        string
	SessionID string
	FilePath  string
	Range     LineRange
	Body      string
	Snapshot  []SnapshotLine
	CreatedAt time.Time
	UpdatedAt time.Time
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
