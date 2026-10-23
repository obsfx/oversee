package cataloggen

import (
	"slices"
	"testing"

	"github.com/obsfx/oversee/internal/catalog"
)

func TestMasonTargetsCoverEveryPlatform(t *testing.T) {
	for _, platform := range catalog.Platforms {
		if len(masonTargets[platform]) == 0 {
			t.Errorf("platform %s has no mason targets", platform)
		}
	}
	if len(masonTargets) != len(catalog.Platforms) {
		t.Errorf("mason targets for %d platforms, catalog has %d", len(masonTargets), len(catalog.Platforms))
	}
}

func TestTargetSetMatches(t *testing.T) {
	var (
		darwinArm64    = catalog.PlatformDarwinArm64
		darwinX64      = catalog.PlatformDarwinX64
		linuxArm64Gnu  = catalog.PlatformLinuxArm64Gnu
		linuxX64Gnu    = catalog.PlatformLinuxX64Gnu
		linuxArm64Musl = catalog.PlatformLinuxArm64Musl
		linuxX64Musl   = catalog.PlatformLinuxX64Musl
		windowsArm64   = catalog.PlatformWindowsArm64
		windowsX64     = catalog.PlatformWindowsX64
	)
	cases := []struct {
		name   string
		target any
		want   []catalog.Platform
	}{
		{name: "no target", target: nil, want: catalog.Platforms},
		{name: "empty list", target: []any{}, want: catalog.Platforms},
		{name: "darwin_arm64", target: "darwin_arm64", want: []catalog.Platform{darwinArm64}},
		{name: "darwin_x64", target: "darwin_x64", want: []catalog.Platform{darwinX64}},
		{name: "darwin", target: "darwin", want: []catalog.Platform{darwinArm64, darwinX64}},
		{name: "unix", target: "unix", want: []catalog.Platform{darwinArm64, darwinX64, linuxArm64Gnu, linuxX64Gnu, linuxArm64Musl, linuxX64Musl}},
		{name: "linux", target: "linux", want: []catalog.Platform{linuxArm64Gnu, linuxX64Gnu, linuxArm64Musl, linuxX64Musl}},
		{name: "linux_x64", target: "linux_x64", want: []catalog.Platform{linuxX64Gnu, linuxX64Musl}},
		{name: "linux_arm64", target: "linux_arm64", want: []catalog.Platform{linuxArm64Gnu, linuxArm64Musl}},
		{name: "linux_x64_gnu", target: "linux_x64_gnu", want: []catalog.Platform{linuxX64Gnu}},
		{name: "linux_arm64_gnu", target: "linux_arm64_gnu", want: []catalog.Platform{linuxArm64Gnu}},
		{name: "linux_x64_musl", target: "linux_x64_musl", want: []catalog.Platform{linuxX64Musl}},
		{name: "linux_arm64_musl", target: "linux_arm64_musl", want: []catalog.Platform{linuxArm64Musl}},
		{name: "win", target: "win", want: []catalog.Platform{windowsArm64, windowsX64}},
		{name: "win_x64", target: "win_x64", want: []catalog.Platform{windowsX64}},
		{name: "win_arm64", target: "win_arm64", want: []catalog.Platform{windowsArm64}},
		{name: "win_x86", target: "win_x86"},
		{name: "linux_x86", target: "linux_x86"},
		{name: "freebsd", target: "freebsd_x64"},
		{name: "list of targets", target: []any{"darwin_arm64", "win_x64"}, want: []catalog.Platform{darwinArm64, windowsX64}},
		{name: "list with values that are not strings", target: []any{"linux_arm64_musl", 3.0, nil}, want: []catalog.Platform{linuxArm64Musl}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			targets := targetSetOf(c.target)
			var got []catalog.Platform
			for _, platform := range catalog.Platforms {
				if targets.Matches(platform) {
					got = append(got, platform)
				}
			}
			if !slices.Equal(got, c.want) {
				t.Fatalf("%v matches %v, want %v", c.target, got, c.want)
			}
		})
	}
}

func TestVariantListFor(t *testing.T) {
	variants := variantListOf([]any{
		map[string]any{"target": "linux_x64_gnu", "file": "gnu.tar.gz"},
		map[string]any{"target": "linux_x64", "file": "linux.tar.gz"},
		"not a variant",
		map[string]any{"target": []any{"darwin", "win"}, "file": "desktop.zip"},
		map[string]any{"target": "darwin_arm64", "file": "shadowed.zip"},
	})
	cases := []struct {
		platform catalog.Platform
		want     string
	}{
		{platform: catalog.PlatformLinuxX64Gnu, want: "gnu.tar.gz"},
		{platform: catalog.PlatformLinuxX64Musl, want: "linux.tar.gz"},
		{platform: catalog.PlatformDarwinArm64, want: "desktop.zip"},
		{platform: catalog.PlatformDarwinX64, want: "desktop.zip"},
		{platform: catalog.PlatformWindowsArm64, want: "desktop.zip"},
		{platform: catalog.PlatformLinuxArm64Gnu},
		{platform: catalog.PlatformLinuxArm64Musl},
	}
	for _, c := range cases {
		t.Run(string(c.platform), func(t *testing.T) {
			variant, ok := variants.For(c.platform)
			if ok != (c.want != "") {
				t.Fatalf("For(%s) found = %v, want %v", c.platform, ok, c.want != "")
			}
			if ok && variant["file"] != c.want {
				t.Fatalf("For(%s) = %v, want file %s", c.platform, variant["file"], c.want)
			}
		})
	}
}

func TestVariantListOf(t *testing.T) {
	single := map[string]any{"file": "tool.zip"}
	cases := []struct {
		name  string
		value any
		want  int
	}{
		{name: "single variant", value: single, want: 1},
		{name: "list of variants", value: []any{single, single}, want: 2},
		{name: "list without variants", value: []any{"tool.zip"}, want: 0},
		{name: "string", value: "tool.zip", want: 0},
		{name: "nothing", value: nil, want: 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := variantListOf(c.value); len(got) != c.want {
				t.Fatalf("variantListOf(%v) has %d variants, want %d", c.value, len(got), c.want)
			}
		})
	}
	variant, ok := variantListOf(single).For(catalog.PlatformWindowsX64)
	if !ok || variant["file"] != "tool.zip" {
		t.Fatalf("a variant without a target = %v, %v, want it on every platform", variant, ok)
	}
}
