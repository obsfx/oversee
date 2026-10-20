package langserver

import (
	"path/filepath"
	"runtime"

	"github.com/obsfx/oversee/internal/catalog"
)

var architectures = map[string]string{"arm64": "arm64", "amd64": "x64"}

func DetectPlatform() (catalog.Platform, bool) {
	arch, ok := architectures[runtime.GOARCH]
	if !ok {
		return "", false
	}
	switch runtime.GOOS {
	case "darwin":
		return catalog.Platform("darwin-" + arch), true
	case "windows":
		return catalog.Platform("win32-" + arch), true
	case "linux":
		return catalog.Platform("linux-" + arch + "-" + linuxLibc()), true
	default:
		return "", false
	}
}

func linuxLibc() string {
	if loaders, _ := filepath.Glob("/lib/ld-musl-*.so.1"); len(loaders) > 0 {
		return "musl"
	}
	return "gnu"
}
