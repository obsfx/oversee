package cataloggen

import (
	"slices"

	"github.com/obsfx/oversee/internal/catalog"
)

var masonTargets = map[catalog.Platform][]string{
	catalog.PlatformDarwinArm64:    {"darwin_arm64", "darwin", "unix"},
	catalog.PlatformDarwinX64:      {"darwin_x64", "darwin", "unix"},
	catalog.PlatformLinuxArm64Gnu:  {"linux_arm64_gnu", "linux_arm64", "linux", "unix"},
	catalog.PlatformLinuxX64Gnu:    {"linux_x64_gnu", "linux_x64", "linux", "unix"},
	catalog.PlatformLinuxArm64Musl: {"linux_arm64_musl", "linux_arm64", "linux", "unix"},
	catalog.PlatformLinuxX64Musl:   {"linux_x64_musl", "linux_x64", "linux", "unix"},
	catalog.PlatformWindowsArm64:   {"win_arm64", "win"},
	catalog.PlatformWindowsX64:     {"win_x64", "win"},
}

type targetSet []string

func targetSetOf(value any) targetSet {
	return targetSet(oneOrList[string](value))
}

func oneOrList[T any](value any) []T {
	switch typed := value.(type) {
	case T:
		return []T{typed}
	case []any:
		list := make([]T, 0, len(typed))
		for _, item := range typed {
			if entry, ok := item.(T); ok {
				list = append(list, entry)
			}
		}
		return list
	default:
		return nil
	}
}

func (t targetSet) Matches(platform catalog.Platform) bool {
	if len(t) == 0 {
		return true
	}
	return slices.ContainsFunc(t, func(target string) bool {
		return slices.Contains(masonTargets[platform], target)
	})
}

type variantList []map[string]any

func variantListOf(value any) variantList {
	return variantList(oneOrList[map[string]any](value))
}

func (v variantList) For(platform catalog.Platform) (map[string]any, bool) {
	index := slices.IndexFunc(v, func(variant map[string]any) bool {
		return targetSetOf(variant["target"]).Matches(platform)
	})
	if index < 0 {
		return nil, false
	}
	return v[index], true
}
