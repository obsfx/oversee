package catalog

import (
	_ "embed"
	"encoding/hex"
	"encoding/json/v2"
	"fmt"
	"iter"
	"path"
	"slices"
	"strconv"
	"strings"
	"sync"
)

const SchemaVersion = 1

const DataDirArgument = "${dataDir}"

const sha256Length = 64

var requirements = []Requirement{RequiresNode, RequiresNpm, RequiresGo, RequiresPython, RequiresJava, RequiresDotnet}

var versionedRequirements = []Requirement{RequiresJava, RequiresDotnet}

var installRequirements = map[InstallType][]Requirement{
	InstallNpm:    {RequiresNode, RequiresNpm},
	InstallGolang: {RequiresGo},
}

var binRunners = map[BinKind]Requirement{
	BinNode:   RequiresNode,
	BinPython: RequiresPython,
	BinJava:   RequiresJava,
	BinDotnet: RequiresDotnet,
}

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
	ID          string                 `json:"id"`
	Description string                 `json:"description,omitempty"`
	Homepage    string                 `json:"homepage,omitempty"`
	Licenses    []string               `json:"licenses,omitempty"`
	Languages   []string               `json:"languages,omitempty"`
	Version     string                 `json:"version"`
	FileTypes   []string               `json:"fileTypes"`
	RootMarkers []string               `json:"rootMarkers,omitempty"`
	Run         Run                    `json:"run"`
	Install     Install                `json:"install"`
	Requires    []Requirement          `json:"requires,omitempty"`
	Minimums    map[Requirement]string `json:"minimums,omitempty"`
}

type Run struct {
	Bin                   string         `json:"bin"`
	Args                  []string       `json:"args,omitempty"`
	InitializationOptions map[string]any `json:"initializationOptions,omitempty"`
}

func (r Run) WithDataDir(dir string) (Run, bool) {
	resolved := r
	used := false
	resolved.Args = make([]string, 0, len(r.Args))
	for _, arg := range r.Args {
		used = used || strings.Contains(arg, DataDirArgument)
		resolved.Args = append(resolved.Args, strings.ReplaceAll(arg, DataDirArgument, dir))
	}
	if r.InitializationOptions != nil {
		options, optionsUsed := replaceDataDir(r.InitializationOptions, dir)
		resolved.InitializationOptions = options.(map[string]any)
		used = used || optionsUsed
	}
	return resolved, used
}

func replaceDataDir(value any, dir string) (any, bool) {
	switch typed := value.(type) {
	case string:
		return strings.ReplaceAll(typed, DataDirArgument, dir), strings.Contains(typed, DataDirArgument)
	case map[string]any:
		resolved := make(map[string]any, len(typed))
		used := false
		for key, item := range typed {
			itemResolved, itemUsed := replaceDataDir(item, dir)
			resolved[key] = itemResolved
			used = used || itemUsed
		}
		return resolved, used
	case []any:
		resolved := make([]any, 0, len(typed))
		used := false
		for _, item := range typed {
			itemResolved, itemUsed := replaceDataDir(item, dir)
			resolved = append(resolved, itemResolved)
			used = used || itemUsed
		}
		return resolved, used
	}
	return value, false
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
		for _, key := range fileType.keys() {
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

func (c Catalog) Server(id string) (Server, bool) {
	index := slices.IndexFunc(c.Servers, func(server Server) bool {
		return server.ID == id
	})
	if index < 0 {
		return Server{}, false
	}
	return c.Servers[index], true
}

func (c Catalog) ServerFor(file string) (Server, string, bool) {
	languageID, ok := c.FileTypeOf(file)
	if !ok {
		return Server{}, "", false
	}
	server, ok := c.Server(c.FileTypes[languageID].Server)
	return server, languageID, ok
}

func (c Catalog) FileTypeOf(file string) (string, bool) {
	base := path.Base(file)
	_, extension, hasExtension := strings.CutLast(base, ".")
	for name, fileType := range c.FileTypes {
		if slices.Contains(fileType.Filenames, base) {
			return name, true
		}
	}
	for name, fileType := range c.FileTypes {
		if hasExtension && slices.Contains(fileType.Extensions, extension) {
			return name, true
		}
	}
	return "", false
}

func (f FileType) keys() []string {
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
	if err := s.Install.Validate(); err != nil {
		return fmt.Errorf("catalog server %q: %w", s.ID, err)
	}
	for _, requirement := range s.Requires {
		if !slices.Contains(requirements, requirement) {
			return fmt.Errorf("catalog server %q requires unknown %q", s.ID, requirement)
		}
	}
	for requirement, minimum := range s.Minimums {
		if !slices.Contains(s.Requires, requirement) {
			return fmt.Errorf("catalog server %q sets a minimum for %q, which it does not require", s.ID, requirement)
		}
		if !slices.Contains(versionedRequirements, requirement) {
			return fmt.Errorf("catalog server %q sets a minimum for %q, which has no version check", s.ID, requirement)
		}
		if major, err := strconv.Atoi(minimum); err != nil || major < 1 {
			return fmt.Errorf("catalog server %q minimum %q for %q is not a major version", s.ID, minimum, requirement)
		}
	}
	for bins := range s.Install.binSets() {
		if _, ok := bins[s.Run.Bin]; !ok {
			return fmt.Errorf("catalog server %q runs %q, which is not one of its bins", s.ID, s.Run.Bin)
		}
	}
	return nil
}

func (i Install) Validate() error {
	for _, value := range append([]string{i.Package, i.Version}, i.ExtraPackages...) {
		if value == "" || strings.HasPrefix(value, "-") {
			return fmt.Errorf("install value %q is empty or looks like a flag", value)
		}
	}
	switch i.Type {
	case InstallNpm, InstallGolang:
		if len(i.Bins) == 0 {
			return fmt.Errorf("%s install has no bins", i.Type)
		}
	case InstallDownload:
		if len(i.Platforms) == 0 {
			return fmt.Errorf("download install has no platforms")
		}
	default:
		return fmt.Errorf("unknown install type %q", i.Type)
	}
	for platform, download := range i.Platforms {
		if !slices.Contains(Platforms, platform) || len(download.Files) == 0 {
			return fmt.Errorf("download for %q is invalid", platform)
		}
		for _, file := range download.Files {
			if err := file.Validate(); err != nil {
				return err
			}
		}
	}
	for bins := range i.binSets() {
		for name, bin := range bins {
			if err := bin.Validate(); err != nil {
				return fmt.Errorf("bin %s: %w", name, err)
			}
		}
	}
	return nil
}

func (i Install) binSets() iter.Seq[map[string]Bin] {
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

func (i Install) AvailableOn(platform Platform) bool {
	if platform == "" {
		return false
	}
	if i.Type != InstallDownload {
		return true
	}
	_, ok := i.Platforms[platform]
	return ok
}

func (i Install) DownloadFor(platform Platform) (Download, bool) {
	download, ok := i.Platforms[platform]
	return download, ok
}

func (i Install) Requirements() []Requirement {
	required := slices.Clone(installRequirements[i.Type])
	for bins := range i.binSets() {
		for _, bin := range bins {
			if requirement, ok := bin.Kind.requirement(); ok {
				required = append(required, requirement)
			}
		}
	}
	slices.Sort(required)
	return slices.Compact(required)
}

func (f File) Validate() error {
	if !strings.HasPrefix(f.URL, "https://") {
		return fmt.Errorf("file %s is not served over https", f.URL)
	}
	if name, ok := CleanPath(f.Name); !ok || name != f.Name || strings.Contains(name, "/") {
		return fmt.Errorf("file name %q is not a plain file name", f.Name)
	}
	if dest, ok := CleanPath(f.Dest); f.Dest != "" && (!ok || dest != f.Dest) {
		return fmt.Errorf("file dest %q leaves the install directory", f.Dest)
	}
	if decoded, err := hex.DecodeString(f.SHA256); err != nil || len(f.SHA256) != sha256Length || hex.EncodeToString(decoded) != f.SHA256 {
		return fmt.Errorf("file %s has no lowercase sha256", f.URL)
	}
	return nil
}

func (b Bin) Validate() error {
	clean, ok := CleanPath(b.Path)
	switch {
	case !b.Kind.known():
		return fmt.Errorf("unknown bin kind %q", b.Kind)
	case !ok || clean != b.Path:
		return fmt.Errorf("bin path %q leaves the install directory", b.Path)
	case b.Kind.named() && strings.Contains(b.Path, "/"):
		return fmt.Errorf("%s bin %q is not a plain name", b.Kind, b.Path)
	default:
		return nil
	}
}

func (k BinKind) named() bool {
	return k == BinNpm || k == BinGolang
}

func (k BinKind) Runner() (Requirement, bool) {
	requirement, ok := binRunners[k]
	return requirement, ok
}

func (k BinKind) requirement() (Requirement, bool) {
	if k == BinNpm {
		return RequiresNode, true
	}
	return k.Runner()
}

func (k BinKind) known() bool {
	_, runs := binRunners[k]
	return k.named() || k == BinExec || runs
}

func CleanPath(value string) (string, bool) {
	if value == "" || strings.ContainsAny(value, `\:`) {
		return "", false
	}
	clean := path.Clean(value)
	if path.IsAbs(clean) || clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
		return "", false
	}
	return clean, true
}
