package langserver

import (
	"encoding/json/v2"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
)

const manifestName = "oversee-install.json"

type Installation struct {
	ID          string           `json:"id"`
	Version     string           `json:"version"`
	Platform    catalog.Platform `json:"platform"`
	InstalledAt time.Time        `json:"installedAt"`
	Bin         catalog.Bin      `json:"bin"`
	Dir         string           `json:"-"`
}

type Installations struct {
	home Home
}

func NewInstallations(home Home) Installations {
	return Installations{home: home}
}

func (s Installations) Find(id string) (Installation, bool, error) {
	entries, err := os.ReadDir(s.home.ServerDir(id))
	if errors.Is(err, fs.ErrNotExist) {
		return Installation{}, false, nil
	}
	if err != nil {
		return Installation{}, false, err
	}
	var found []Installation
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		installation, err := readManifest(filepath.Join(s.home.ServerDir(id), entry.Name()))
		if err != nil {
			continue
		}
		found = append(found, installation)
	}
	if len(found) == 0 {
		return Installation{}, false, nil
	}
	return slices.MaxFunc(found, func(left, right Installation) int {
		return left.InstalledAt.Compare(right.InstalledAt)
	}), true, nil
}

func (s Installations) InstalledVersion(id string) (string, error) {
	installation, found, err := s.Find(id)
	if err != nil || !found {
		return "", err
	}
	return installation.Version, nil
}

func (s Installations) Remove(id string) error {
	return os.RemoveAll(s.home.ServerDir(id))
}

var binRunners = map[catalog.BinKind]catalog.Requirement{
	catalog.BinNode:   catalog.RequiresNode,
	catalog.BinPython: catalog.RequiresPython,
	catalog.BinJava:   catalog.RequiresJava,
	catalog.BinDotnet: catalog.RequiresDotnet,
}

func (i Installation) Entry() string {
	switch i.Bin.Kind {
	case catalog.BinNpm:
		return filepath.Join(i.Dir, "node_modules", ".bin", i.Bin.Path+platformSuffix(".cmd"))
	case catalog.BinGolang:
		return filepath.Join(i.Dir, "bin", i.Bin.Path+platformSuffix(".exe"))
	default:
		return filepath.Join(i.Dir, filepath.FromSlash(i.Bin.Path))
	}
}

func (i Installation) Command(toolchain Toolchain) (string, []string, error) {
	entry := i.Entry()
	requirement, needsRunner := binRunners[i.Bin.Kind]
	if !needsRunner {
		return entry, nil, nil
	}
	runner, err := toolchain.Command(requirement)
	if err != nil {
		return "", nil, err
	}
	if i.Bin.Kind == catalog.BinJava {
		return runner, []string{"-jar", entry}, nil
	}
	return runner, []string{entry}, nil
}

func readManifest(dir string) (Installation, error) {
	content, err := os.ReadFile(filepath.Join(dir, manifestName))
	if err != nil {
		return Installation{}, err
	}
	var installation Installation
	if err := json.Unmarshal(content, &installation); err != nil {
		return Installation{}, fmt.Errorf("decode %s: %w", manifestName, err)
	}
	installation.Dir = dir
	return installation, nil
}

func writeManifest(installation Installation) error {
	content, err := json.Marshal(installation)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(installation.Dir, manifestName), content, 0o644)
}

func platformSuffix(suffix string) string {
	if runtime.GOOS == "windows" {
		return suffix
	}
	return ""
}
