package cli

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/obsfx/oversee/internal/app"
)

func initCommand(opts *options) *cobra.Command {
	return &cobra.Command{
		Use:   "init",
		Short: "Create the .oversee directory and database in the current directory",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			ws, created, err := app.Init(cmd.Context(), opts.dir)
			if err != nil {
				return err
			}
			if created {
				_, err = fmt.Fprintf(cmd.OutOrStdout(), "initialized %s\n", ws.DataDir())
				return err
			}
			_, err = fmt.Fprintf(cmd.OutOrStdout(), "already initialized at %s\n", ws.DataDir())
			return err
		},
	}
}
