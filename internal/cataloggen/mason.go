package cataloggen

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json/v2"
	"fmt"
	"io"
	"slices"
	"strings"
)

const (
	masonRepository   = "mason-org/mason-registry"
	masonArchiveName  = "registry.json.zip"
	masonRegistryName = "registry.json"
	masonChecksums    = "checksums.txt"
)

type MasonRegistry struct {
	Release  string
	Packages []MasonPackage
}

type MasonPackage struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Homepage    string            `json:"homepage"`
	Licenses    []string          `json:"licenses"`
	Languages   []string          `json:"languages"`
	Deprecation *masonDeprecation `json:"deprecation"`
	Source      MasonSource       `json:"source"`
	Bin         map[string]string `json:"bin"`
}

type MasonSource struct {
	ID                 string   `json:"id"`
	Asset              any      `json:"asset"`
	Download           any      `json:"download"`
	ExtraPackages      []string `json:"extra_packages"`
	SupportedPlatforms []string `json:"supported_platforms"`
}

type masonDeprecation struct {
	Message string `json:"message"`
}

type checksumList map[string]string

func LoadMasonRegistry(ctx context.Context, github *GitHub) (MasonRegistry, error) {
	release, err := github.LatestRelease(ctx, masonRepository)
	if err != nil {
		return MasonRegistry{}, fmt.Errorf("mason registry release: %w", err)
	}
	checksums, err := github.FetchAsset(ctx, release, masonChecksums)
	if err != nil {
		return MasonRegistry{}, err
	}
	archive, err := github.FetchAsset(ctx, release, masonArchiveName)
	if err != nil {
		return MasonRegistry{}, err
	}
	sums := parseChecksums(checksums)
	if err := sums.Verify(masonArchiveName, archive); err != nil {
		return MasonRegistry{}, err
	}
	registry, err := unzipFile(archive, masonRegistryName)
	if err != nil {
		return MasonRegistry{}, err
	}
	if err := sums.Verify(masonRegistryName, registry); err != nil {
		return MasonRegistry{}, err
	}
	var packages []MasonPackage
	if err := json.Unmarshal(registry, &packages); err != nil {
		return MasonRegistry{}, fmt.Errorf("decode mason registry: %w", err)
	}
	return MasonRegistry{Release: release.Tag, Packages: packages}, nil
}

func (r MasonRegistry) Package(name string) (MasonPackage, bool) {
	index := slices.IndexFunc(r.Packages, func(pkg MasonPackage) bool {
		return pkg.Name == name
	})
	if index < 0 {
		return MasonPackage{}, false
	}
	return r.Packages[index], true
}

func (p MasonPackage) Install() (Resolution, error) {
	purl, err := ParsePurl(p.Source.ID)
	if err != nil {
		return Resolution{}, err
	}
	return installResolver{pkg: p, purl: purl}.Resolve()
}

func parseChecksums(content []byte) checksumList {
	sums := checksumList{}
	for line := range bytes.Lines(content) {
		fields := strings.Fields(string(line))
		if len(fields) == 2 {
			sums[fields[1]] = fields[0]
		}
	}
	return sums
}

func (c checksumList) Verify(name string, content []byte) error {
	expected, ok := c[name]
	if !ok {
		return fmt.Errorf("checksums have no entry for %s", name)
	}
	sum := sha256.Sum256(content)
	if actual := hex.EncodeToString(sum[:]); actual != expected {
		return fmt.Errorf("%s checksum %s does not match %s", name, actual, expected)
	}
	return nil
}

func unzipFile(archive []byte, name string) ([]byte, error) {
	reader, err := zip.NewReader(bytes.NewReader(archive), int64(len(archive)))
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", masonArchiveName, err)
	}
	file, err := reader.Open(name)
	if err != nil {
		return nil, fmt.Errorf("open %s in %s: %w", name, masonArchiveName, err)
	}
	defer file.Close()
	return io.ReadAll(file)
}
