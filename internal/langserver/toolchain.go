package langserver

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"

	"github.com/obsfx/oversee/internal/catalog"
)

type Toolchain struct{}

func (t Toolchain) Missing(requirements []catalog.Requirement) []catalog.Requirement {
	var missing []catalog.Requirement
	for _, requirement := range requirements {
		if _, err := t.Command(requirement); err != nil {
			missing = append(missing, requirement)
		}
	}
	return missing
}

func (Toolchain) Command(requirement catalog.Requirement) (string, error) {
	for _, name := range commandNames(requirement) {
		path, err := exec.LookPath(name)
		if err == nil && !windowsAppAlias(requirement, path) {
			return path, nil
		}
	}
	return "", fmt.Errorf("%s is not on PATH", requirement)
}

func windowsAppAlias(requirement catalog.Requirement, path string) bool {
	return runtime.GOOS == "windows" && requirement == catalog.RequiresPython && strings.Contains(strings.ToLower(path), `\microsoft\windowsapps\`)
}

func commandNames(requirement catalog.Requirement) []string {
	if requirement == catalog.RequiresPython && runtime.GOOS == "windows" {
		return []string{"python3", "python"}
	}
	return []string{string(requirement)}
}
