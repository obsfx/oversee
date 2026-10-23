package cli

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/obsfx/oversee/internal/app"
)

type options struct {
	dir string
}

func Execute(version string) int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	opts := &options{}
	root := &cobra.Command{
		Use:           "oversee",
		Short:         "Diff review and line annotation for git repositories",
		Version:       version,
		SilenceUsage:  true,
		SilenceErrors: true,
	}
	root.PersistentFlags().StringVarP(&opts.dir, "dir", "C", ".", "run as if oversee was started in this directory")
	root.AddCommand(initCommand(opts), serveCommand(opts), reviewCommand(opts), licensesCommand())
	if err := root.ExecuteContext(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return 1
	}
	return 0
}

func (o *options) withApp(cmd *cobra.Command, run func(ctx context.Context, application *app.App) error) (err error) {
	ctx := cmd.Context()
	application, err := app.Open(ctx, o.dir)
	if err != nil {
		return err
	}
	defer func() {
		err = errors.Join(err, application.Close())
	}()
	return run(ctx, application)
}
