package cli

import (
	"encoding/json/v2"
	"fmt"
	"io"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/transport/dto"
)

const timeLayout = "2006-01-02 15:04"

type reviewPresenter struct {
	out    io.Writer
	asJSON bool
}

func newReviewPresenter(out io.Writer, asJSON bool) reviewPresenter {
	return reviewPresenter{out: out, asJSON: asJSON}
}

func (p reviewPresenter) Page(page domain.SessionPage) error {
	if p.asJSON {
		return p.json(dto.SessionPageOf(page))
	}
	if page.Total == 0 {
		return p.line("no finished review sessions")
	}
	if len(page.Sessions) == 0 {
		return p.line(fmt.Sprintf("page %d is empty, there are %d pages", page.Page, page.PageCount()))
	}
	table := tabwriter.NewWriter(p.out, 0, 0, 2, ' ', 0)
	fmt.Fprintln(table, "ID\tSTATUS\tCOMPARISON\tCOMMENTS\tFINISHED")
	for _, session := range page.Sessions {
		fmt.Fprintf(table, "%s\t%s\t%s\t%d\t%s\n",
			session.ID, session.Status, comparisonLabel(session.Comparison),
			session.CommentCount, formatTime(session.FinishedAt),
		)
	}
	if err := table.Flush(); err != nil {
		return err
	}
	return p.line(fmt.Sprintf("\npage %d of %d, %d sessions total", page.Page, page.PageCount(), page.Total))
}

func (p reviewPresenter) Detail(detail domain.SessionDetail) error {
	if p.asJSON {
		return p.json(dto.SessionOf(detail))
	}
	var builder strings.Builder
	fmt.Fprintf(&builder, "session %s\nstatus: %s\ncomparison: %s\nfinished: %s\ncomments: %d\n",
		detail.ID, detail.Status, comparisonLabel(detail.Comparison),
		formatTime(detail.FinishedAt), detail.CommentCount,
	)
	for _, thread := range detail.Threads {
		writeThread(&builder, thread)
	}
	_, err := io.WriteString(p.out, builder.String())
	return err
}

func (p reviewPresenter) StatusChange(session domain.Session, changed bool) error {
	if !changed {
		return p.line(fmt.Sprintf("session %s is already %s", session.ID, session.Status))
	}
	return p.line(fmt.Sprintf("session %s is now %s", session.ID, session.Status))
}

func (p reviewPresenter) Reply(reply domain.Reply) error {
	return p.line(fmt.Sprintf("replied to comment %s (reply %s)", reply.CommentID, reply.ID))
}

func (p reviewPresenter) json(value any) error {
	if err := json.MarshalWrite(p.out, value); err != nil {
		return err
	}
	_, err := fmt.Fprintln(p.out)
	return err
}

func (p reviewPresenter) line(text string) error {
	_, err := fmt.Fprintln(p.out, text)
	return err
}

func writeThread(builder *strings.Builder, thread domain.CommentThread) {
	fmt.Fprintf(builder, "\n--- comment %s\n%s:%d-%d (%s)\n",
		thread.ID, thread.FilePath, thread.Range.Start, thread.Range.End, thread.Range.EndSide,
	)
	for _, line := range thread.Snapshot {
		fmt.Fprintf(builder, "%6d | %s\n", line.Number, line.Text)
	}
	builder.WriteString("\n")
	for line := range strings.Lines(thread.Body) {
		builder.WriteString("> " + strings.TrimRight(line, "\n") + "\n")
	}
	for _, reply := range thread.Replies {
		fmt.Fprintf(builder, "\nreply from %s at %s:\n%s\n", reply.Author, formatTime(reply.CreatedAt), reply.Body)
	}
}

func comparisonLabel(comparison domain.Comparison) string {
	return comparison.Source + " -> " + comparison.Target
}

func formatTime(at time.Time) string {
	return at.Format(timeLayout)
}
