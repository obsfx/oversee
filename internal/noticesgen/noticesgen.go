package noticesgen

import (
	"bytes"
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"fmt"
	"maps"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strings"

	"github.com/obsfx/oversee/internal/notices"
)

const (
	binaryPackage  = "./cmd/oversee"
	moduleTemplate = "{{with .Module}}{{if not .Main}}{{.Path}}\t{{.Version}}\t{{.Dir}}{{end}}{{end}}"
)

var targets = []struct{ goos, goarch string }{
	{goos: "darwin", goarch: "arm64"},
	{goos: "darwin", goarch: "amd64"},
	{goos: "linux", goarch: "arm64"},
	{goos: "linux", goarch: "amd64"},
	{goos: "windows", goarch: "arm64"},
	{goos: "windows", goarch: "amd64"},
}

var licenseFile = regexp.MustCompile(`(?i)^(licen[cs]e|copying|notice|patents)([-_.][\w.-]*)?$`)

type listedModule struct {
	path    string
	version string
	dir     string
}

func Collect(ctx context.Context, repoDir string) ([]notices.Module, error) {
	listed := map[string]listedModule{}
	for _, target := range targets {
		if err := listModules(ctx, repoDir, target.goos, target.goarch, listed); err != nil {
			return nil, fmt.Errorf("%s/%s: %w", target.goos, target.goarch, err)
		}
	}
	var modules []notices.Module
	for _, path := range slices.Sorted(maps.Keys(listed)) {
		module := listed[path]
		licenses, err := readLicenses(module.dir)
		if err != nil {
			return nil, fmt.Errorf("%s %s: %w", module.path, module.version, err)
		}
		modules = append(modules, notices.Module{Path: module.path, Version: module.version, Licenses: licenses})
	}
	return modules, nil
}

func Encode(modules []notices.Module) ([]byte, error) {
	var content bytes.Buffer
	if err := json.MarshalEncode(jsontext.NewEncoder(&content, jsontext.WithIndent("  ")), modules, json.Deterministic(true)); err != nil {
		return nil, err
	}
	return content.Bytes(), nil
}

func Check(path string, content []byte) error {
	current, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if !bytes.Equal(current, content) {
		return fmt.Errorf("%s is out of date, run pnpm generate:notices", path)
	}
	return nil
}

func listModules(ctx context.Context, repoDir, goos, goarch string, listed map[string]listedModule) error {
	command := exec.CommandContext(ctx, "go", "list", "-deps", "-f", moduleTemplate, binaryPackage)
	command.Dir = repoDir
	command.Env = append(os.Environ(), "GOOS="+goos, "GOARCH="+goarch, "CGO_ENABLED=0")
	command.Stderr = os.Stderr
	output, err := command.Output()
	if err != nil {
		return fmt.Errorf("go list: %w", err)
	}
	return addModules(string(output), listed)
}

func addModules(output string, listed map[string]listedModule) error {
	for line := range strings.SplitSeq(output, "\n") {
		if line == "" {
			continue
		}
		fields := strings.Split(line, "\t")
		if len(fields) != 3 || fields[2] == "" {
			return fmt.Errorf("unexpected go list line %q", line)
		}
		listed[fields[0]] = listedModule{path: fields[0], version: fields[1], dir: fields[2]}
	}
	return nil
}

func readLicenses(dir string) ([]notices.License, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var licenses []notices.License
	for _, entry := range entries {
		name := entry.Name()
		if !entry.Type().IsRegular() || !licenseFile.MatchString(name) || filepath.Ext(name) == ".go" {
			continue
		}
		content, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return nil, err
		}
		licenses = append(licenses, notices.License{File: name, Text: strings.TrimRight(string(content), "\n") + "\n"})
	}
	if len(licenses) == 0 {
		return nil, fmt.Errorf("no license file in %s", dir)
	}
	return licenses, nil
}
