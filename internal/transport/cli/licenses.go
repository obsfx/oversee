package cli

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/obsfx/oversee/internal/gdscript"
)

func licensesCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "licenses",
		Short: "Print the licenses of the third-party code built into the GDScript parser",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			var texts []string
			for _, notice := range gdscript.Notices() {
				texts = append(texts, notice.Text())
			}
			_, err := fmt.Fprint(cmd.OutOrStdout(), strings.Join(texts, "\n"))
			return err
		},
	}
}
