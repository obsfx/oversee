package cli

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/obsfx/oversee/internal/gdscript"
	"github.com/obsfx/oversee/internal/notices"
)

func licensesCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "licenses",
		Short: "Print the licenses of the third-party code built into oversee",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			compiled, err := notices.Compiled()
			if err != nil {
				return err
			}
			var texts []string
			for _, notice := range append(compiled, gdscript.Notices()...) {
				texts = append(texts, notice.Text())
			}
			_, err = fmt.Fprint(cmd.OutOrStdout(), strings.Join(texts, "\n"))
			return err
		},
	}
}
