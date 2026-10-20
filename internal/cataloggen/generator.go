package cataloggen

import (
	"context"
	"errors"
	"fmt"
	"log"
	"maps"
	"slices"

	"github.com/obsfx/oversee/internal/catalog"
)

type Generator struct {
	github   *GitHub
	previous catalog.Catalog
	log      *log.Logger
}

func NewGenerator(github *GitHub, previous catalog.Catalog, logger *log.Logger) *Generator {
	return &Generator{github: github, previous: previous, log: logger}
}

func (g *Generator) Generate(ctx context.Context) (catalog.Catalog, Report, error) {
	curated, err := LoadCuratedServers()
	if err != nil {
		return catalog.Catalog{}, Report{}, err
	}
	registry, err := LoadMasonRegistry(ctx, g.github)
	if err != nil {
		return catalog.Catalog{}, Report{}, err
	}
	g.log.Printf("mason %s", registry.Release)
	report := Report{MasonRelease: registry.Release}
	servers := make([]catalog.Server, 0, len(curated))
	for _, id := range slices.Sorted(maps.Keys(curated)) {
		server, err := g.resolve(id, curated[id], registry, &report)
		if err != nil {
			return catalog.Catalog{}, report, err
		}
		servers = append(servers, server)
	}
	servers, err = g.withChecksums(ctx, curated, servers, &report)
	if err != nil {
		return catalog.Catalog{}, report, err
	}
	servers, err = g.validated(servers, curated, &report)
	if err != nil {
		return catalog.Catalog{}, report, err
	}
	report.Servers = servers
	result := catalog.Catalog{
		SchemaVersion: catalog.SchemaVersion,
		MasonRelease:  registry.Release,
		FileTypes:     curated.FileTypes(),
		Servers:       servers,
	}
	return result, report, result.Validate()
}

func (g *Generator) resolve(id string, curated CuratedServer, registry MasonRegistry, report *Report) (catalog.Server, error) {
	pkg, found := registry.Package(id)
	if !found {
		return g.fallback(id, curated, errors.New("not in the mason registry"), report)
	}
	if pkg.Deprecation != nil {
		report.warn(id, "deprecated in mason: "+pkg.Deprecation.Message)
	}
	resolution, err := pkg.Install()
	if err != nil {
		return g.fallback(id, curated, err, report)
	}
	for _, platform := range slices.Sorted(maps.Keys(resolution.Skipped)) {
		report.warn(id, fmt.Sprintf("%s skipped: %v", platform, resolution.Skipped[platform]))
	}
	return curated.Resolve(id, pkg, resolution), nil
}

func (g *Generator) fallback(id string, curated CuratedServer, cause error, report *Report) (catalog.Server, error) {
	previous, ok := g.previous.Server(id)
	if !ok {
		return catalog.Server{}, fmt.Errorf("%s: %w", id, cause)
	}
	report.warn(id, "kept version "+previous.Version+": "+cause.Error())
	return curated.Apply(previous), nil
}

func (g *Generator) withChecksums(ctx context.Context, curated CuratedServers, servers []catalog.Server, report *Report) ([]catalog.Server, error) {
	var urls []string
	for _, server := range servers {
		for _, download := range server.Install.Platforms {
			for _, file := range download.Files {
				urls = append(urls, file.URL)
			}
		}
	}
	slices.Sort(urls)
	result := NewChecksumResolver(g.github, g.previous, g.log).Resolve(ctx, slices.Compact(urls))
	signed := make([]catalog.Server, 0, len(servers))
	for _, server := range servers {
		if server.Install.Type != catalog.InstallDownload {
			signed = append(signed, server)
			continue
		}
		platforms := map[catalog.Platform]catalog.Download{}
		for _, platform := range slices.Sorted(maps.Keys(server.Install.Platforms)) {
			download := server.Install.Platforms[platform]
			files, err := result.Sign(download.Files)
			if err != nil {
				report.warn(server.ID, fmt.Sprintf("%s dropped: %v", platform, err))
				continue
			}
			download.Files = files
			platforms[platform] = download
		}
		server.Install.Platforms = platforms
		if len(platforms) == 0 {
			kept, err := g.fallback(server.ID, curated[server.ID], errors.New("no download with a checksum"), report)
			if err != nil {
				return nil, err
			}
			server = kept
		}
		signed = append(signed, server)
	}
	return signed, nil
}

func (g *Generator) validated(servers []catalog.Server, curated CuratedServers, report *Report) ([]catalog.Server, error) {
	valid := make([]catalog.Server, 0, len(servers))
	for _, server := range servers {
		if err := server.Validate(); err != nil {
			kept, fallbackErr := g.fallback(server.ID, curated[server.ID], err, report)
			if fallbackErr != nil {
				return nil, fallbackErr
			}
			server = kept
		}
		valid = append(valid, server)
	}
	return valid, nil
}
