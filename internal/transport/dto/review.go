package dto

import "github.com/obsfx/oversee/internal/domain"

type Comparison struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

func ComparisonOf(comparison domain.Comparison) Comparison {
	return Comparison{Source: comparison.Source, Target: comparison.Target}
}

func (c Comparison) ToDomain() domain.Comparison {
	return domain.Comparison{Source: c.Source, Target: c.Target}
}

type LineRange struct {
	Start   int    `json:"start"`
	End     int    `json:"end"`
	Side    string `json:"side"`
	EndSide string `json:"endSide"`
}

func lineRangeOf(lineRange domain.LineRange) LineRange {
	return LineRange{
		Start:   lineRange.Start,
		End:     lineRange.End,
		Side:    string(lineRange.Side),
		EndSide: string(lineRange.EndSide),
	}
}

func (r LineRange) ToDomain() domain.LineRange {
	return domain.LineRange{
		Start:   r.Start,
		End:     r.End,
		Side:    domain.Side(r.Side),
		EndSide: domain.Side(r.EndSide),
	}
}

type Comment struct {
	ID         string         `json:"id"`
	FilePath   string         `json:"filePath"`
	Range      LineRange      `json:"range"`
	Body       string         `json:"body"`
	Lines      []SnapshotLine `json:"lines"`
	CreatedAt  int64          `json:"createdAt"`
	UpdatedAt  int64          `json:"updatedAt"`
	OutdatedAt int64          `json:"outdatedAt"`
}

func CommentOf(comment domain.Comment) Comment {
	lines := make([]SnapshotLine, 0, len(comment.Snapshot))
	for _, line := range comment.Snapshot {
		lines = append(lines, SnapshotLine{Number: line.Number, Text: line.Text})
	}
	return Comment{
		ID:         comment.ID,
		FilePath:   comment.FilePath,
		Range:      lineRangeOf(comment.Range),
		Body:       comment.Body,
		Lines:      lines,
		CreatedAt:  millis(comment.CreatedAt),
		UpdatedAt:  millis(comment.UpdatedAt),
		OutdatedAt: millis(comment.OutdatedAt),
	}
}

func CommentsOf(comments []domain.Comment) []Comment {
	mapped := make([]Comment, 0, len(comments))
	for _, comment := range comments {
		mapped = append(mapped, CommentOf(comment))
	}
	return mapped
}

type SnapshotLine struct {
	Number int    `json:"number"`
	Text   string `json:"text"`
}

type Reply struct {
	ID        string `json:"id"`
	CommentID string `json:"commentId"`
	Author    string `json:"author"`
	Body      string `json:"body"`
	CreatedAt int64  `json:"createdAt"`
}

func ReplyOf(reply domain.Reply) Reply {
	return Reply{
		ID:        reply.ID,
		CommentID: reply.CommentID,
		Author:    reply.Author,
		Body:      reply.Body,
		CreatedAt: millis(reply.CreatedAt),
	}
}

type SessionComment struct {
	Comment
	Replies []Reply `json:"replies"`
}

func sessionCommentOf(thread domain.CommentThread) SessionComment {
	replies := make([]Reply, 0, len(thread.Replies))
	for _, reply := range thread.Replies {
		replies = append(replies, ReplyOf(reply))
	}
	return SessionComment{Comment: CommentOf(thread.Comment), Replies: replies}
}

type SessionSummary struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	Target       string `json:"target"`
	Status       string `json:"status"`
	CreatedAt    int64  `json:"createdAt"`
	FinishedAt   int64  `json:"finishedAt"`
	CommentCount int    `json:"commentCount"`
}

func SessionSummaryOf(session domain.Session) SessionSummary {
	return SessionSummary{
		ID:           session.ID,
		Source:       session.Comparison.Source,
		Target:       session.Comparison.Target,
		Status:       string(session.Status),
		CreatedAt:    millis(session.CreatedAt),
		FinishedAt:   millis(session.FinishedAt),
		CommentCount: session.CommentCount,
	}
}

type Session struct {
	SessionSummary
	Comments []SessionComment `json:"comments"`
}

func SessionOf(detail domain.SessionDetail) Session {
	comments := make([]SessionComment, 0, len(detail.Threads))
	for _, thread := range detail.Threads {
		comments = append(comments, sessionCommentOf(thread))
	}
	return Session{SessionSummary: SessionSummaryOf(detail.Session), Comments: comments}
}

func SessionsOf(details []domain.SessionDetail) []Session {
	mapped := make([]Session, 0, len(details))
	for _, detail := range details {
		mapped = append(mapped, SessionOf(detail))
	}
	return mapped
}

type SessionPage struct {
	Sessions []SessionSummary `json:"sessions"`
	Page     int              `json:"page"`
	Limit    int              `json:"limit"`
	Total    int              `json:"total"`
}

func SessionPageOf(page domain.SessionPage) SessionPage {
	sessions := make([]SessionSummary, 0, len(page.Sessions))
	for _, session := range page.Sessions {
		sessions = append(sessions, SessionSummaryOf(session))
	}
	return SessionPage{Sessions: sessions, Page: page.Page, Limit: page.Limit, Total: page.Total}
}

type CommentList struct {
	Comments []Comment `json:"comments"`
}

type CommentBody struct {
	Comment Comment `json:"comment"`
}

type SessionList struct {
	Sessions []Session `json:"sessions"`
}

type SessionBody struct {
	Session Session `json:"session"`
}

type CreateCommentRequest struct {
	Source        string    `json:"source"`
	Target        string    `json:"target"`
	FilePath      string    `json:"filePath"`
	PreviousPath  string    `json:"previousPath"`
	Range         LineRange `json:"range"`
	Body          string    `json:"body"`
	ExpectedLines *[]string `json:"expectedLines"`
}

func (r CreateCommentRequest) ToDomain() (domain.Comparison, domain.CommentDraft) {
	comparison := domain.Comparison{Source: r.Source, Target: r.Target}
	draft := domain.CommentDraft{
		FilePath:     r.FilePath,
		PreviousPath: r.PreviousPath,
		Range:        r.Range.ToDomain(),
		Body:         r.Body,
	}
	if r.ExpectedLines != nil {
		draft.ExpectedLines = *r.ExpectedLines
		draft.VerifyLines = true
	}
	return comparison, draft
}

type UpdateCommentRequest struct {
	Body string `json:"body"`
}
