package cataloggen

import (
	_ "embed"
	"encoding/json/v2"
	"fmt"
	"maps"
	"slices"
	"strings"

	"github.com/obsfx/oversee/internal/catalog"
)

//go:embed servers.json
var curatedSource []byte

type CuratedServers map[string]CuratedServer

type CuratedServer struct {
	FileTypes   map[string]CuratedFileType `json:"fileTypes"`
	RootMarkers []string                   `json:"rootMarkers"`
	Run         catalog.Run                `json:"run"`
	Requires    []catalog.Requirement      `json:"requires"`
	SkipFiles   []string                   `json:"skipFiles"`
}

type CuratedFileType struct {
	Extensions []string `json:"extensions"`
	Filenames  []string `json:"filenames"`
}

func LoadCuratedServers() (CuratedServers, error) {
	var servers CuratedServers
	if err := json.Unmarshal(curatedSource, &servers, json.RejectUnknownMembers(true)); err != nil {
		return nil, fmt.Errorf("decode curated servers: %w", err)
	}
	return servers, nil
}

func (c CuratedServers) FileTypes() map[string]catalog.FileType {
	fileTypes := map[string]catalog.FileType{}
	for id, server := range c {
		for name, fileType := range server.FileTypes {
			fileTypes[name] = catalog.FileType{Extensions: fileType.Extensions, Filenames: fileType.Filenames, Server: id}
		}
	}
	return fileTypes
}

func (c CuratedServer) Resolve(id string, pkg MasonPackage, resolution Resolution) catalog.Server {
	for platform, download := range resolution.Install.Platforms {
		download.Files = slices.DeleteFunc(download.Files, func(file catalog.File) bool {
			return slices.Contains(c.SkipFiles, file.Name)
		})
		resolution.Install.Platforms[platform] = download
	}
	return c.Apply(catalog.Server{
		ID:          id,
		Description: strings.Join(strings.Fields(pkg.Description), " "),
		Homepage:    pkg.Homepage,
		Licenses:    pkg.Licenses,
		Languages:   pkg.Languages,
		Version:     resolution.Install.Version,
		Install:     resolution.Install,
	})
}

func (c CuratedServer) Apply(server catalog.Server) catalog.Server {
	server.FileTypes = slices.Sorted(maps.Keys(c.FileTypes))
	server.RootMarkers = c.RootMarkers
	server.Run = c.Run
	requires := slices.Concat(server.Install.Requirements(), c.Requires)
	slices.Sort(requires)
	server.Requires = slices.Compact(requires)
	return server
}
