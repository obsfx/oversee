package langserver

import (
	"context"
	"os"

	"github.com/obsfx/oversee/internal/catalog"
)

type Launcher struct {
	home      Home
	toolchain Toolchain
}

func NewLauncher(home Home, toolchain Toolchain) Launcher {
	return Launcher{home: home, toolchain: toolchain}
}

func (l Launcher) Start(ctx context.Context, installation Installation, run catalog.Run, root string) (*Process, map[string]any, error) {
	dir := l.home.DataDir(installation.ID, root)
	resolved, usesDataDir := run.WithDataDir(dir)
	if usesDataDir {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, nil, err
		}
	}
	process, err := installation.Start(ctx, l.toolchain, resolved.Args, root)
	if err != nil {
		return nil, nil, err
	}
	return process, resolved.InitializationOptions, nil
}
