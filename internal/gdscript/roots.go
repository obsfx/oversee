package gdscript

import (
	"path"
	"strings"
)

func IsScript(file string) bool {
	return strings.HasSuffix(file, ScriptExtension)
}

func IsScene(file string) bool {
	return strings.HasSuffix(file, SceneExtension)
}

func ProjectRoots(paths []string) []string {
	return directoriesHolding(paths, ProjectFile)
}

func IgnoredDirectories(paths []string) []string {
	return directoriesHolding(paths, ignoreFile)
}

func directoriesHolding(paths []string, name string) []string {
	var directories []string
	for _, file := range paths {
		if path.Base(file) == name {
			directories = append(directories, directoryOf(file))
		}
	}
	return directories
}

func IsIgnored(ignored []string, root, file string) bool {
	for _, directory := range ignored {
		if len(directory) > len(root) && strings.HasPrefix(file, directory+"/") {
			return true
		}
	}
	return false
}

func RootOf(roots []string, file string) string {
	nearest := ""
	for _, root := range roots {
		if root != "" && strings.HasPrefix(file, root+"/") && len(root) > len(nearest) {
			nearest = root
		}
	}
	return nearest
}

func SettingsPath(root string) string {
	return path.Join(root, ProjectFile)
}

func directoryOf(file string) string {
	directory := path.Dir(file)
	if directory == "." {
		return ""
	}
	return directory
}
