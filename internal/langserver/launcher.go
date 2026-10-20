package langserver

import (
	"context"
	"slices"
	"strings"

	"github.com/obsfx/oversee/internal/catalog"
)

type Launcher struct {
	home      Home
	toolchain Toolchain
}

func NewLauncher(home Home, toolchain Toolchain) Launcher {
	return Launcher{home: home, toolchain: toolchain}
}

func (l Launcher) Start(ctx context.Context, installation Installation, run catalog.Run, root string) (*Process, error) {
	args := slices.Clone(run.Args)
	for index, arg := range args {
		if !strings.Contains(arg, catalog.DataDirArgument) {
			continue
		}
		dir, err := l.home.EnsureDataDir(installation.ID, root)
		if err != nil {
			return nil, err
		}
		args[index] = strings.ReplaceAll(arg, catalog.DataDirArgument, dir)
	}
	return installation.Start(ctx, l.toolchain, args, root)
}
