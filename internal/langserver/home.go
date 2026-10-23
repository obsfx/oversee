package langserver

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	homeEnv     = "OVERSEE_HOME"
	homeDirName = ".oversee"
	serversDir  = "lsp"
	tempDir     = ".tmp"
	dataDir     = ".data"
)

type Home struct {
	root string
}

func ResolveHome() (Home, error) {
	if dir := os.Getenv(homeEnv); dir != "" {
		absolute, err := filepath.Abs(dir)
		if err != nil {
			return Home{}, fmt.Errorf("%s: %w", homeEnv, err)
		}
		return Home{root: absolute}, nil
	}
	user, err := os.UserHomeDir()
	if err != nil {
		return Home{}, fmt.Errorf("resolve home directory: %w", err)
	}
	return Home{root: filepath.Join(user, homeDirName)}, nil
}

func (h Home) ServersDir() string {
	return filepath.Join(h.root, serversDir)
}

func (h Home) ServerDir(id string) string {
	return filepath.Join(h.ServersDir(), id)
}

func (h Home) InstallDir(id, version string) string {
	return filepath.Join(h.ServerDir(id), versionDirName(version))
}

func (h Home) TempDir() string {
	return filepath.Join(h.ServersDir(), tempDir)
}

func (h Home) DataDir(id, root string) string {
	sum := sha256.Sum256([]byte(root))
	return filepath.Join(h.serverDataDir(id), hex.EncodeToString(sum[:8]))
}

func (h Home) serverDataDir(id string) string {
	return filepath.Join(h.ServersDir(), dataDir, id)
}

func versionDirName(version string) string {
	return strings.Map(func(r rune) rune {
		if r == '/' || r == '\\' || r == ':' {
			return '_'
		}
		return r
	}, version)
}
