package cataloggen

import (
	"fmt"
	"io"
	"strings"

	"github.com/obsfx/oversee/internal/catalog"
)

type Report struct {
	MasonRelease string
	Servers      []catalog.Server
	Warnings     []string
}

func (r *Report) warn(id, message string) {
	r.Warnings = append(r.Warnings, id+": "+message)
}

func (r Report) WriteTo(w io.Writer) (int64, error) {
	var text strings.Builder
	fmt.Fprintf(&text, "## Language server catalog\n\nmason release `%s`\n\n", r.MasonRelease)
	text.WriteString("| server | version | install | platforms |\n| --- | --- | --- | --- |\n")
	for _, server := range r.Servers {
		fmt.Fprintf(&text, "| %s | %s | %s | %s |\n", server.ID, server.Version, server.Install.Type, r.coverage(server.Install))
	}
	if len(r.Warnings) > 0 {
		text.WriteString("\nwarnings:\n\n")
		for _, warning := range r.Warnings {
			fmt.Fprintf(&text, "- %s\n", warning)
		}
	}
	written, err := io.WriteString(w, text.String())
	return int64(written), err
}

func (r Report) coverage(install catalog.Install) string {
	var missing []string
	for _, platform := range catalog.Platforms {
		if !install.AvailableOn(platform) {
			missing = append(missing, string(platform))
		}
	}
	if len(missing) == 0 {
		return "all"
	}
	return "all but " + strings.Join(missing, ", ")
}
