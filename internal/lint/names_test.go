package lint

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"maps"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

var sourceRoots = []string{
	filepath.Join("..", "..", "internal"),
	filepath.Join("..", "..", "cmd"),
}

type declaredFunc struct {
	name     string
	method   bool
	position token.Position
}

func (f declaredFunc) String() string {
	kind := "func"
	if f.method {
		kind = "method"
	}
	return fmt.Sprintf("%s %s (%s)", kind, f.name, f.position)
}

func skipped(entry fs.DirEntry) bool {
	return entry.IsDir() && (entry.Name() == "testdata" || entry.Name() == "sqldb")
}

func packageFuncs(t *testing.T) map[string][]declaredFunc {
	t.Helper()
	files := token.NewFileSet()
	packages := map[string][]declaredFunc{}
	for _, root := range sourceRoots {
		err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if skipped(entry) {
				return filepath.SkipDir
			}
			if entry.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_gen.go") {
				return nil
			}
			file, err := parser.ParseFile(files, path, nil, parser.SkipObjectResolution)
			if err != nil {
				return err
			}
			key := filepath.Dir(path) + " package " + file.Name.Name
			for _, decl := range file.Decls {
				if function, ok := decl.(*ast.FuncDecl); ok {
					packages[key] = append(packages[key], declaredFunc{
						name:     function.Name.Name,
						method:   function.Recv != nil,
						position: files.Position(function.Name.Pos()),
					})
				}
			}
			return nil
		})
		if err != nil {
			t.Fatalf("walk %s: %v", root, err)
		}
	}
	return packages
}

func TestFunctionNamesAreDistinct(t *testing.T) {
	packages := packageFuncs(t)
	if len(packages) == 0 {
		t.Fatal("found no Go packages to check")
	}
	for _, key := range slices.Sorted(maps.Keys(packages)) {
		byName := map[string][]declaredFunc{}
		for _, function := range packages[key] {
			lower := strings.ToLower(function.name)
			byName[lower] = append(byName[lower], function)
		}
		for _, name := range slices.Sorted(maps.Keys(byName)) {
			group := byName[name]
			hasFunc := slices.ContainsFunc(group, func(function declaredFunc) bool {
				return !function.method
			})
			if len(group) < 2 || !hasFunc {
				continue
			}
			var names []string
			for _, function := range group {
				names = append(names, function.String())
			}
			t.Errorf("%s: a package-level function shares its name with another function or method when letter case is ignored, give each one its own name: %s", key, strings.Join(names, ", "))
		}
	}
}
