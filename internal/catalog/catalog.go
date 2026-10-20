package catalog

import (
	_ "embed"
	"encoding/json/v2"
	"fmt"
	"iter"
	"slices"
	"sync"
)

const SchemaVersion = 1

const DataDirArgument = "${dataDir}"

//go:embed catalog.json
var embedded []byte

var Embedded = sync.OnceValues(func() (Catalog, error) {
	var catalog Catalog
	if err := json.Unmarshal(embedded, &catalog); err != nil {
		return Catalog{}, fmt.Errorf("decode embedded catalog: %w", err)
	}
	return catalog, catalog.Validate()
})

type Platform string

const (
	PlatformDarwinArm64    Platform = "darwin-arm64"
	PlatformDarwinX64      Platform = "darwin-x64"
	PlatformLinuxArm64Gnu  Platform = "linux-arm64-gnu"
	PlatformLinuxX64Gnu    Platform = "linux-x64-gnu"
	PlatformLinuxArm64Musl Platform = "linux-arm64-musl"
	PlatformLinuxX64Musl   Platform = "linux-x64-musl"
	PlatformWindowsArm64   Platform = "win32-arm64"
	PlatformWindowsX64     Platform = "win32-x64"
)

var Platforms = []Platform{
	PlatformDarwinArm64,
	PlatformDarwinX64,
	PlatformLinuxArm64Gnu,
	PlatformLinuxX64Gnu,
	PlatformLinuxArm64Musl,
	PlatformLinuxX64Musl,
	PlatformWindowsArm64,
	PlatformWindowsX64,
}

type InstallType string

const (
	InstallNpm      InstallType = "npm"
	InstallGolang   InstallType = "golang"
	InstallDownload InstallType = "download"
)

type BinKind string

const (
	BinExec   BinKind = "exec"
	BinNpm    BinKind = "npm"
	BinGolang BinKind = "golang"
	BinNode   BinKind = "node"
	BinPython BinKind = "python"
	BinJava   BinKind = "java-jar"
	BinDotnet BinKind = "dotnet"
)

type Requirement string

const (
	RequiresNode   Requirement = "node"
	RequiresNpm    Requirement = "npm"
	RequiresGo     Requirement = "go"
	RequiresPython Requirement = "python3"
	RequiresJava   Requirement = "java"
	RequiresDotnet Requirement = "dotnet"
)

type Catalog struct {
	SchemaVersion int                 `json:"schemaVersion"`
	MasonRelease  string              `json:"masonRelease"`
	FileTypes     map[string]FileType `json:"fileTypes"`
	Servers       []Server            `json:"servers"`
}

type FileType struct {
	Extensions []string `json:"extensions,omitempty"`
	Filenames  []string `json:"filenames,omitempty"`
	Server     string   `json:"server"`
}

type Server struct {
	ID          string        `json:"id"`
	Description string        `json:"description,omitempty"`
	Homepage    string        `json:"homepage,omitempty"`
	Licenses    []string      `json:"licenses,omitempty"`
	Languages   []string      `json:"languages,omitempty"`
	Version     string        `json:"version"`
	FileTypes   []string      `json:"fileTypes"`
	RootMarkers []string      `json:"rootMarkers,omitempty"`
	Run         Run           `json:"run"`
	Install     Install       `json:"install"`
	Requires    []Requirement `json:"requires,omitempty"`
}

type Run struct {
	Bin  string   `json:"bin"`
	Args []string `json:"args,omitempty"`
}

type Install struct {
	Type          InstallType           `json:"type"`
	Package       string                `json:"package"`
	Version       string                `json:"version"`
	ExtraPackages []string              `json:"extraPackages,omitempty"`
	Bins          map[string]Bin        `json:"bins,omitempty"`
	Platforms     map[Platform]Download `json:"platforms,omitempty"`
}

type Download struct {
	Files []File         `json:"files"`
	Bins  map[string]Bin `json:"bins"`
}

type File struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
	Name   string `json:"name"`
	Dest   string `json:"dest,omitempty"`
}

type Bin struct {
	Kind BinKind `json:"kind"`
	Path string  `json:"path"`
}

func (c Catalog) Validate() error {
	if c.SchemaVersion != SchemaVersion {
		return fmt.Errorf("catalog schema version %d, expected %d", c.SchemaVersion, SchemaVersion)
	}
	servers := make(map[string]Server, len(c.Servers))
	for _, server := range c.Servers {
		if _, duplicate := servers[server.ID]; duplicate {
			return fmt.Errorf("catalog server %q is listed twice", server.ID)
		}
		if err := server.Validate(); err != nil {
			return err
		}
		servers[server.ID] = server
	}
	owners := map[string]string{}
	for name, fileType := range c.FileTypes {
		server, ok := servers[fileType.Server]
		if !ok || !slices.Contains(server.FileTypes, name) {
			return fmt.Errorf("catalog file type %q points to %q, which does not handle it", name, fileType.Server)
		}
		for _, key := range fileType.Keys() {
			if owner, taken := owners[key]; taken {
				return fmt.Errorf("catalog maps %q to both %s and %s", key, owner, name)
			}
			owners[key] = name
		}
	}
	for _, server := range c.Servers {
		for _, name := range server.FileTypes {
			if c.FileTypes[name].Server != server.ID {
				return fmt.Errorf("catalog server %q handles %q, which is not mapped to it", server.ID, name)
			}
		}
	}
	return nil
}

func (f FileType) Keys() []string {
	keys := make([]string, 0, len(f.Extensions)+len(f.Filenames))
	for _, extension := range f.Extensions {
		keys = append(keys, "*."+extension)
	}
	return append(keys, f.Filenames...)
}

func (s Server) Validate() error {
	if s.ID == "" || s.Version == "" || s.Run.Bin == "" || len(s.FileTypes) == 0 {
		return fmt.Errorf("catalog server %q is missing its id, version, run bin or file types", s.ID)
	}
	for bins := range s.Install.BinSets() {
		if _, ok := bins[s.Run.Bin]; !ok {
			return fmt.Errorf("catalog server %q runs %q, which is not one of its bins", s.ID, s.Run.Bin)
		}
	}
	if s.Install.Type == InstallDownload && len(s.Install.Platforms) == 0 {
		return fmt.Errorf("catalog server %q has no downloads", s.ID)
	}
	for platform, download := range s.Install.Platforms {
		for _, file := range download.Files {
			if file.URL == "" || file.Name == "" || len(file.SHA256) != 64 {
				return fmt.Errorf("catalog server %q has an incomplete file for %s", s.ID, platform)
			}
		}
	}
	return nil
}

func (i Install) BinSets() iter.Seq[map[string]Bin] {
	return func(yield func(map[string]Bin) bool) {
		if i.Type != InstallDownload {
			yield(i.Bins)
			return
		}
		for _, download := range i.Platforms {
			if !yield(download.Bins) {
				return
			}
		}
	}
}
