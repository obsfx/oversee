package langserver

import (
	"context"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
)

const (
	versionProbeTimeout = 5 * time.Second
	versionLifetime     = time.Minute
)

var javaVersionPattern = regexp.MustCompile(`version "(\d+)(?:\.(\d+))?`)

var versionProbes = map[catalog.Requirement]func(ctx context.Context, command string) toolVersion{
	catalog.RequiresJava:   javaMajor,
	catalog.RequiresDotnet: dotnetRuntimeMajor,
}

type toolVersions struct {
	mu      sync.Mutex
	entries map[string]toolVersion
}

type toolVersion struct {
	major   int
	known   bool
	failed  bool
	checked time.Time
}

func newToolVersions() *toolVersions {
	return &toolVersions{entries: map[string]toolVersion{}}
}

func (v *toolVersions) of(requirement catalog.Requirement, command string) toolVersion {
	probe, ok := versionProbes[requirement]
	if !ok {
		return toolVersion{}
	}
	if v == nil {
		return probeVersion(probe, command)
	}
	v.mu.Lock()
	cached, found := v.entries[command]
	v.mu.Unlock()
	if found && time.Since(cached.checked) < versionLifetime {
		return cached
	}
	version := probeVersion(probe, command)
	v.mu.Lock()
	defer v.mu.Unlock()
	v.entries[command] = version
	return version
}

func probeVersion(probe func(ctx context.Context, command string) toolVersion, command string) toolVersion {
	ctx, cancel := context.WithTimeout(context.Background(), versionProbeTimeout)
	defer cancel()
	version := probe(ctx, command)
	version.checked = time.Now()
	return version
}

func javaMajor(ctx context.Context, command string) toolVersion {
	probe := exec.CommandContext(ctx, command, "-version")
	probe.WaitDelay = commandGrace
	output, err := probe.CombinedOutput()
	if err != nil {
		return toolVersion{failed: ctx.Err() == nil}
	}
	major, known := parseJavaMajor(string(output))
	return toolVersion{major: major, known: known}
}

func parseJavaMajor(output string) (int, bool) {
	match := javaVersionPattern.FindStringSubmatch(output)
	if match == nil {
		return 0, false
	}
	major, err := strconv.Atoi(match[1])
	if err != nil {
		return 0, false
	}
	if major == 1 && match[2] != "" {
		major, err = strconv.Atoi(match[2])
		if err != nil {
			return 0, false
		}
	}
	return major, true
}

func dotnetRuntimeMajor(ctx context.Context, command string) toolVersion {
	probe := exec.CommandContext(ctx, command, "--list-runtimes")
	probe.WaitDelay = commandGrace
	output, err := probe.Output()
	if err != nil {
		return toolVersion{failed: ctx.Err() == nil}
	}
	major, known := parseDotnetRuntimeMajor(string(output))
	return toolVersion{major: major, known: known, failed: !known}
}

func parseDotnetRuntimeMajor(output string) (int, bool) {
	highest, known := 0, false
	for line := range strings.Lines(output) {
		version, found := strings.CutPrefix(line, "Microsoft.NETCore.App ")
		if !found {
			continue
		}
		majorText, _, _ := strings.Cut(version, ".")
		major, err := strconv.Atoi(majorText)
		if err != nil {
			continue
		}
		highest, known = max(highest, major), true
	}
	return highest, known
}
