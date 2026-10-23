package langserver

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
)

const javaHomeEnv = "JAVA_HOME"

type Toolchain struct {
	versions *toolVersions
}

func NewToolchain() Toolchain {
	return Toolchain{versions: newToolVersions()}
}

func (t Toolchain) Missing(requirements []catalog.Requirement, minimums map[catalog.Requirement]string) []domain.MissingTool {
	var missing []domain.MissingTool
	for _, requirement := range requirements {
		command, err := t.Command(requirement)
		if err != nil {
			missing = append(missing, domain.MissingTool{Tool: string(requirement)})
			continue
		}
		minimum, required := minimums[requirement]
		if !required {
			continue
		}
		version := t.versions.of(requirement, command)
		if version.failed {
			missing = append(missing, domain.MissingTool{Tool: string(requirement)})
			continue
		}
		if version.known && version.major < atoi(minimum) {
			missing = append(missing, domain.MissingTool{Tool: string(requirement), Minimum: minimum, Found: strconv.Itoa(version.major)})
		}
	}
	return missing
}

func atoi(value string) int {
	number, _ := strconv.Atoi(value)
	return number
}

func (Toolchain) Command(requirement catalog.Requirement) (string, error) {
	if java, found := javaHomeCommand(requirement); found {
		return java, nil
	}
	for _, name := range commandNames(requirement) {
		path, err := exec.LookPath(name)
		if err == nil && !windowsAppAlias(requirement, path) {
			return path, nil
		}
	}
	return "", fmt.Errorf("%s is not on PATH", requirement)
}

func javaHomeCommand(requirement catalog.Requirement) (string, bool) {
	home := os.Getenv(javaHomeEnv)
	if requirement != catalog.RequiresJava || home == "" {
		return "", false
	}
	java := filepath.Join(home, "bin", "java")
	if runtime.GOOS == "windows" {
		java += ".exe"
	}
	info, err := os.Stat(java)
	return java, err == nil && info.Mode().IsRegular()
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
