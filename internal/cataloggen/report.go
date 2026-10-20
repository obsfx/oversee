package cataloggen

import (
	"fmt"
	"io"
	"slices"
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
		fmt.Fprintf(&text, "| %s | %s | %s | %s |\n", server.ID, server.Version, server.Install.Type, platformCoverage(server.Install))
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

func platformCoverage(install catalog.Install) string {
	if install.Type != catalog.InstallDownload {
		return "all"
	}
	missing := slices.DeleteFunc(slices.Clone(catalog.Platforms), func(platform catalog.Platform) bool {
		_, ok := install.Platforms[platform]
		return ok
	})
	if len(missing) == 0 {
		return "all"
	}
	names := make([]string, 0, len(missing))
	for _, platform := range missing {
		names = append(names, string(platform))
	}
	return "all but " + strings.Join(names, ", ")
}
