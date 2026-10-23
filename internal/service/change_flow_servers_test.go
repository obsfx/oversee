package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript"
	"github.com/obsfx/oversee/internal/git"
	"github.com/obsfx/oversee/internal/langserver"
	"github.com/obsfx/oversee/internal/lsp"
)

type serverFixture struct {
	server  string
	base    map[string]string
	edits   map[string]string
	nodes   []string
	edges   []string
	origins []string
}

var goServerFixture = serverFixture{
	server: "gopls",
	base: map[string]string{
		"go.mod": "module example.com/probe\n\ngo 1.22\n",
		"main.go": `package main

type Store interface {
	Save(value int) int
}

type fileStore struct{}

func (fileStore) Save(value int) int {
	return value
}

func main() {
	run(fileStore{})
}

func run(store Store) int {
	return store.Save(helper())
}

func helper() int {
	return 1
}
`,
	},
	edits: map[string]string{
		"main.go": `package main

type Store interface {
	Save(value int) int
}

type fileStore struct{}

func (fileStore) Save(value int) int {
	return value + 1
}

func main() {
	run(fileStore{})
}

func run(store Store) int {
	return store.Save(helper()) * 2
}

func helper() int {
	return 2
}
`,
	},
	nodes:   []string{"(fileStore).Save method modified", "run function modified", "helper function modified"},
	edges:   []string{"run -> (fileStore).Save implementation", "run -> helper call"},
	origins: []string{"run <- main"},
}

var typescriptServerFixture = serverFixture{
	server: "typescript-language-server",
	base: map[string]string{
		"tsconfig.json": `{"compilerOptions": {"strict": true, "target": "es2022", "module": "esnext", "moduleResolution": "bundler"}, "include": ["src"]}` + "\n",
		"src/store.ts": `export interface Store {
  save(value: number): number
}

export class FileStore implements Store {
  save(value: number): number {
    return value
  }
}
`,
		"src/helper.ts": `export function helper(): number {
  return 1
}
`,
		"src/run.ts": `import { FileStore, type Store } from './store'
import { helper } from './helper'

export function run(store: Store): number {
  return store.save(helper())
}

export function main(): number {
  return run(new FileStore())
}
`,
	},
	edits: map[string]string{
		"src/store.ts": `export interface Store {
  save(value: number): number
}

export class FileStore implements Store {
  save(value: number): number {
    return value + 1
  }
}
`,
		"src/helper.ts": `export function helper(): number {
  return 2
}
`,
		"src/run.ts": `import { FileStore, type Store } from './store'
import { helper } from './helper'

export function run(store: Store): number {
  return store.save(helper()) * 2
}

export function main(): number {
  return run(new FileStore())
}
`,
	},
	nodes:   []string{"helper function modified", "run function modified", "FileStore.save method modified"},
	edges:   []string{"run -> FileStore.save implementation", "run -> helper call"},
	origins: []string{"run <- main"},
}

func TestChangeFlowWithRealServers(t *testing.T) {
	if testing.Short() {
		t.Skip("starts real language servers")
	}
	for _, fixture := range []serverFixture{goServerFixture, typescriptServerFixture} {
		t.Run(fixture.server, func(t *testing.T) {
			graph := realServerFlow(t, fixture)

			expectServers(t, graph, domain.FlowServer{Server: fixture.server, Status: domain.ServerReady})
			expectStrings(t, "nodes", namedNodes(graph), fixture.nodes)
			expectStrings(t, "edges", namedEdges(graph), fixture.edges)
			expectStrings(t, "origins", namedOrigins(graph), fixture.origins)
		})
	}
}

func realServerFlow(t *testing.T, fixture serverFixture) domain.FlowGraph {
	t.Helper()
	servers, err := catalog.Embedded()
	if err != nil {
		t.Fatal(err)
	}
	home, err := langserver.ResolveHome()
	if err != nil {
		t.Fatal(err)
	}
	installations := langserver.NewInstallations(home)
	if _, installed, err := installations.Find(fixture.server); err != nil || !installed {
		t.Skipf("%s is not installed", fixture.server)
	}
	root := committedRepository(t, fixture.base)
	for path, content := range fixture.edits {
		writeFixtureFile(t, root, path, content)
	}
	pool := lsp.NewPool(time.Minute, 15*time.Second)
	t.Cleanup(pool.Close)
	toolchain := langserver.NewToolchain()
	flows := NewChangeFlowService(servers, git.NewRepository(root, filepath.Join(root, ".git")), installations, langserver.NewLauncher(home, toolchain), langserver.NewProject(root), pool, gdscript.NewAnalyzer())
	t.Cleanup(flows.Close)
	deadline := time.Now().Add(2 * time.Minute)
	for {
		graph, err := flows.Flow(t.Context(), uncommitted)
		if err != nil {
			t.Fatal(err)
		}
		if graph.Settled() || time.Now().After(deadline) {
			return graph
		}
		time.Sleep(time.Second)
	}
}

func committedRepository(t *testing.T, files map[string]string) string {
	t.Helper()
	root, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	for path, content := range files {
		writeFixtureFile(t, root, path, content)
	}
	for _, args := range [][]string{
		{"init", "--quiet", "--initial-branch=main"},
		{"add", "--all"},
		{"-c", "user.name=oversee", "-c", "user.email=oversee@example.com", "-c", "commit.gpgsign=false", "commit", "--quiet", "--message", "base"},
	} {
		command := exec.Command("git", args...)
		command.Dir = root
		command.Env = append(os.Environ(), "GIT_CONFIG_GLOBAL=/dev/null", "GIT_CONFIG_NOSYSTEM=1")
		if output, err := command.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, output)
		}
	}
	return root
}

func writeFixtureFile(t *testing.T, root, path, content string) {
	t.Helper()
	file := filepath.Join(root, filepath.FromSlash(path))
	if err := os.MkdirAll(filepath.Dir(file), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(file, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func namedNodes(graph domain.FlowGraph) []string {
	nodes := make([]string, 0, len(graph.Nodes))
	for _, node := range graph.Nodes {
		nodes = append(nodes, fmt.Sprintf("%s %s %s", node.Name, node.Kind, node.Change))
	}
	return nodes
}

func namedEdges(graph domain.FlowGraph) []string {
	names := map[string]string{}
	for _, node := range graph.Nodes {
		names[node.ID] = node.Name
	}
	edges := make([]string, 0, len(graph.Edges))
	for _, edge := range graph.Edges {
		edges = append(edges, fmt.Sprintf("%s -> %s %s", names[edge.From], names[edge.To], edge.Via))
	}
	slices.Sort(edges)
	return edges
}

func namedOrigins(graph domain.FlowGraph) []string {
	names := map[string]string{}
	for _, node := range graph.Nodes {
		names[node.ID] = node.Name
	}
	var origins []string
	for id, list := range graph.Origins {
		for _, origin := range list {
			origins = append(origins, fmt.Sprintf("%s <- %s", names[id], origin.Name))
		}
	}
	slices.Sort(origins)
	return origins
}
