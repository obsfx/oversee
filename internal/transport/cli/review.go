package cli

import (
	"context"
	"io"

	"github.com/spf13/cobra"

	"github.com/obsfx/oversee/internal/app"
	"github.com/obsfx/oversee/internal/domain"
)

func reviewCommand(opts *options) *cobra.Command {
	command := &cobra.Command{
		Use:   "review",
		Short: "Inspect and update finished review sessions",
	}
	command.AddCommand(
		reviewListCommand(opts),
		reviewGetCommand(opts),
		reviewStatusCommand(opts, "start", "Mark a review session as in progress", domain.StatusInProgress),
		reviewStatusCommand(opts, "close", "Mark a review session as closed", domain.StatusClosed),
		reviewReplyCommand(opts),
	)
	return command
}

func reviewListCommand(opts *options) *cobra.Command {
	var request domain.PageRequest
	var asJSON bool
	command := &cobra.Command{
		Use:   "list",
		Short: "List finished review sessions, newest first",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return opts.withApp(cmd, func(ctx context.Context, application *app.App) error {
				page, err := application.Services.Reviews.List(ctx, request)
				if err != nil {
					return err
				}
				return newReviewPresenter(cmd.OutOrStdout(), asJSON).Page(page)
			})
		},
	}
	command.Flags().IntVar(&request.Page, "page", 1, "page number, starting at 1")
	command.Flags().IntVar(&request.Limit, "limit", 20, "sessions per page")
	command.Flags().BoolVar(&asJSON, "json", false, "print JSON")
	return command
}

func reviewGetCommand(opts *options) *cobra.Command {
	var asJSON bool
	command := &cobra.Command{
		Use:   "get <session-id>",
		Short: "Show a review session with its comments, code snapshots and replies",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return opts.withApp(cmd, func(ctx context.Context, application *app.App) error {
				detail, err := application.Services.Reviews.Detail(ctx, args[0])
				if err != nil {
					return err
				}
				return newReviewPresenter(cmd.OutOrStdout(), asJSON).Detail(detail)
			})
		},
	}
	command.Flags().BoolVar(&asJSON, "json", false, "print JSON")
	return command
}

func reviewStatusCommand(opts *options, name, short string, status domain.Status) *cobra.Command {
	return &cobra.Command{
		Use:   name + " <session-id>",
		Short: short,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return opts.withApp(cmd, func(ctx context.Context, application *app.App) error {
				session, changed, err := application.Services.Reviews.ChangeStatus(ctx, args[0], status)
				if err != nil {
					return err
				}
				return newReviewPresenter(cmd.OutOrStdout(), false).StatusChange(session, changed)
			})
		},
	}
}

func reviewReplyCommand(opts *options) *cobra.Command {
	draft := domain.ReplyDraft{}
	command := &cobra.Command{
		Use:   "reply <comment-id>",
		Short: "Reply to a review comment, for questions or comments that need no code change",
		Long:  "Reply to a review comment. The reply text comes from --body, or from stdin when --body is omitted.",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			draft.CommentID = args[0]
			if draft.Body == "" {
				input, err := io.ReadAll(cmd.InOrStdin())
				if err != nil {
					return err
				}
				draft.Body = string(input)
			}
			return opts.withApp(cmd, func(ctx context.Context, application *app.App) error {
				reply, err := application.Services.Reviews.Reply(ctx, draft)
				if err != nil {
					return err
				}
				return newReviewPresenter(cmd.OutOrStdout(), false).Reply(reply)
			})
		},
	}
	command.Flags().StringVarP(&draft.Body, "body", "b", "", "reply text")
	command.Flags().StringVar(&draft.Author, "author", "agent", "name shown as the reply author")
	return command
}
