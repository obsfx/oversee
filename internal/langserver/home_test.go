package langserver

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveHome(t *testing.T) {
	t.Run("OVERSEE_HOME overrides the home directory", func(t *testing.T) {
		dir := t.TempDir()
		t.Setenv(homeEnv, dir)
		home, err := ResolveHome()
		if err != nil {
			t.Fatal(err)
		}
		if want := filepath.Join(dir, "lsp"); home.ServersDir() != want {
			t.Errorf("ServersDir = %s, want %s", home.ServersDir(), want)
		}
	})
	t.Run("a relative OVERSEE_HOME resolves against the working directory", func(t *testing.T) {
		t.Chdir(t.TempDir())
		t.Setenv(homeEnv, filepath.Join("relative", "home"))
		working, err := os.Getwd()
		if err != nil {
			t.Fatal(err)
		}
		home, err := ResolveHome()
		if err != nil {
			t.Fatal(err)
		}
		if want := filepath.Join(working, "relative", "home", "lsp"); home.ServersDir() != want {
			t.Errorf("ServersDir = %s, want %s", home.ServersDir(), want)
		}
	})
	t.Run("without OVERSEE_HOME the home is ~/.oversee", func(t *testing.T) {
		user := t.TempDir()
		t.Setenv(homeEnv, "")
		t.Setenv("HOME", user)
		t.Setenv("USERPROFILE", user)
		home, err := ResolveHome()
		if err != nil {
			t.Fatal(err)
		}
		if want := filepath.Join(user, ".oversee", "lsp"); home.ServersDir() != want {
			t.Errorf("ServersDir = %s, want %s", home.ServersDir(), want)
		}
	})
}

func TestHomeLayout(t *testing.T) {
	root := filepath.Join(t.TempDir(), "home")
	home := Home{root: root}
	servers := filepath.Join(root, "lsp")
	tests := []struct {
		name string
		got  string
		want string
	}{
		{name: "servers", got: home.ServersDir(), want: servers},
		{name: "server", got: home.ServerDir("gopls"), want: filepath.Join(servers, "gopls")},
		{name: "install", got: home.InstallDir("gopls", "0.20.0"), want: filepath.Join(servers, "gopls", "0.20.0")},
		{name: "install of a version with separators", got: home.InstallDir("jdtls", `v1/2\3:4`), want: filepath.Join(servers, "jdtls", "v1_2_3_4")},
		{name: "temp", got: home.TempDir(), want: filepath.Join(servers, ".tmp")},
		{name: "data", got: home.DataDir("jdtls", "/repo"), want: filepath.Join(servers, ".data", "jdtls", "816fc349d3faebf8")},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if test.got != test.want {
				t.Errorf("got %s, want %s", test.got, test.want)
			}
		})
	}
}

func TestHomeDataDirIsPerServerAndRoot(t *testing.T) {
	home := Home{root: t.TempDir()}
	first := home.DataDir("jdtls", "/repo/service")
	if again := home.DataDir("jdtls", "/repo/service"); again != first {
		t.Errorf("DataDir is not stable: %s then %s", first, again)
	}
	if other := home.DataDir("jdtls", "/repo/other"); other == first {
		t.Errorf("two roots share the data dir %s", first)
	}
	if other := home.DataDir("rust-analyzer", "/repo/service"); filepath.Base(other) != filepath.Base(first) || filepath.Dir(other) == filepath.Dir(first) {
		t.Errorf("DataDir(rust-analyzer) = %s, want the same root hash under its own server dir (jdtls: %s)", other, first)
	}
	if name := filepath.Base(first); len(name) != 16 {
		t.Errorf("root hash %q has %d characters, want 16", name, len(name))
	}
}
