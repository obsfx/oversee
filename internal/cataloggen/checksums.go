package cataloggen

import (
	"context"
	"fmt"
	"log"
	"maps"
	"net/url"
	"slices"
	"strings"
	"sync"

	"github.com/obsfx/oversee/internal/catalog"
)

const checksumWorkers = 8

type releaseKey struct {
	repository string
	tag        string
}

type ChecksumResolver struct {
	github *GitHub
	known  map[string]string
	log    *log.Logger
}

type ChecksumResult struct {
	Sums     map[string]string
	Failures map[string]error
}

func NewChecksumResolver(github *GitHub, previous catalog.Catalog, logger *log.Logger) *ChecksumResolver {
	known := map[string]string{}
	for _, server := range previous.Servers {
		for _, download := range server.Install.Platforms {
			for _, file := range download.Files {
				if _, _, immutable := githubReleaseFile(file.URL); immutable {
					known[file.URL] = file.SHA256
				}
			}
		}
	}
	return &ChecksumResolver{github: github, known: known, log: logger}
}

func (c *ChecksumResolver) Resolve(ctx context.Context, urls []string) ChecksumResult {
	result := ChecksumResult{Sums: map[string]string{}, Failures: map[string]error{}}
	releases := map[releaseKey][]string{}
	var downloads []string
	for _, link := range urls {
		if sum, ok := c.known[link]; ok {
			result.Sums[link] = sum
			continue
		}
		if key, _, ok := githubReleaseFile(link); ok {
			releases[key] = append(releases[key], link)
			continue
		}
		downloads = append(downloads, link)
	}
	c.log.Printf("checksums: %d from the previous catalog, %d releases to look up, %d other files", len(result.Sums), len(releases), len(downloads))
	for link, digest := range c.releaseDigests(ctx, releases) {
		switch {
		case digest.err != nil:
			result.Failures[link] = digest.err
		case digest.value == "":
			downloads = append(downloads, link)
		default:
			result.Sums[link] = digest.value
		}
	}
	c.log.Printf("checksums: hashing %d files without a published digest", len(downloads))
	for link, digest := range c.hashes(ctx, downloads) {
		if digest.err != nil {
			result.Failures[link] = digest.err
			continue
		}
		result.Sums[link] = digest.value
	}
	return result
}

func (r ChecksumResult) Sign(files []catalog.File) ([]catalog.File, error) {
	signed := make([]catalog.File, 0, len(files))
	for _, file := range files {
		sum, ok := r.Sums[file.URL]
		if !ok {
			if err := r.Failures[file.URL]; err != nil {
				return nil, err
			}
			return nil, fmt.Errorf("no checksum for %s", file.URL)
		}
		file.SHA256 = sum
		signed = append(signed, file)
	}
	return signed, nil
}

type digestResult struct {
	value string
	err   error
}

type digestResults struct {
	mutex  sync.Mutex
	values map[string]digestResult
}

func (d *digestResults) set(link string, result digestResult) {
	d.mutex.Lock()
	defer d.mutex.Unlock()
	d.values[link] = result
}

func (c *ChecksumResolver) releaseDigests(ctx context.Context, releases map[releaseKey][]string) map[string]digestResult {
	results := &digestResults{values: map[string]digestResult{}}
	forEachParallel(slices.Collect(maps.Keys(releases)), func(key releaseKey) {
		release, err := c.github.ReleaseByTag(ctx, key.repository, key.tag)
		for _, link := range releases[key] {
			results.set(link, releaseDigest(release, err, key, link))
		}
	})
	return results.values
}

func (c *ChecksumResolver) hashes(ctx context.Context, links []string) map[string]digestResult {
	results := &digestResults{values: map[string]digestResult{}}
	forEachParallel(links, func(link string) {
		c.log.Printf("hashing %s", link)
		sum, err := c.github.Hash(ctx, link)
		results.set(link, digestResult{value: sum, err: err})
	})
	return results.values
}

func releaseDigest(release Release, err error, key releaseKey, link string) digestResult {
	if err != nil {
		return digestResult{err: fmt.Errorf("release %s@%s: %w", key.repository, key.tag, err)}
	}
	_, name, _ := githubReleaseFile(link)
	asset, found := release.Asset(name)
	if !found {
		return digestResult{err: fmt.Errorf("release %s@%s has no asset %s", key.repository, key.tag, name)}
	}
	sum, _ := asset.SHA256()
	return digestResult{value: sum}
}

func forEachParallel[T any](items []T, run func(T)) {
	limit := make(chan struct{}, checksumWorkers)
	var group sync.WaitGroup
	for _, item := range items {
		group.Go(func() {
			limit <- struct{}{}
			defer func() { <-limit }()
			run(item)
		})
	}
	group.Wait()
}

func githubReleaseFile(link string) (releaseKey, string, bool) {
	rest, ok := strings.CutPrefix(link, "https://github.com/")
	if !ok {
		return releaseKey{}, "", false
	}
	repository, rest, ok := strings.Cut(rest, "/releases/download/")
	if !ok {
		return releaseKey{}, "", false
	}
	tag, escaped, ok := strings.CutLast(rest, "/")
	if !ok {
		return releaseKey{}, "", false
	}
	name, err := url.PathUnescape(escaped)
	if err != nil {
		return releaseKey{}, "", false
	}
	return releaseKey{repository: repository, tag: tag}, name, true
}
