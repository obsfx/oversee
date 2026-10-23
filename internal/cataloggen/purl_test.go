package cataloggen

import (
	"strings"
	"testing"
)

func TestParsePurl(t *testing.T) {
	cases := []struct {
		name          string
		id            string
		want          Purl
		wantQualified string
		wantGo        string
	}{
		{
			name:          "npm",
			id:            "pkg:npm/typescript-language-server@4.3.3",
			want:          Purl{Type: "npm", Name: "typescript-language-server", Version: "4.3.3"},
			wantQualified: "typescript-language-server",
			wantGo:        "typescript-language-server",
		},
		{
			name:          "scoped npm with an encoded scope",
			id:            "pkg:npm/%40vue/language-server@2.1.6",
			want:          Purl{Type: "npm", Namespace: "@vue", Name: "language-server", Version: "2.1.6"},
			wantQualified: "@vue/language-server",
			wantGo:        "@vue/language-server",
		},
		{
			name:          "scoped npm with a plain scope",
			id:            "pkg:npm/@vtsls/language-server@0.2.6",
			want:          Purl{Type: "npm", Namespace: "@vtsls", Name: "language-server", Version: "0.2.6"},
			wantQualified: "@vtsls/language-server",
			wantGo:        "@vtsls/language-server",
		},
		{
			name:          "npm with qualifiers",
			id:            "pkg:npm/pyright@1.1.390?repository_url=https://registry.example.com",
			want:          Purl{Type: "npm", Name: "pyright", Version: "1.1.390"},
			wantQualified: "pyright",
			wantGo:        "pyright",
		},
		{
			name:          "golang with a subpath",
			id:            "pkg:golang/golang.org/x/tools@v0.30.0#gopls",
			want:          Purl{Type: "golang", Namespace: "golang.org/x", Name: "tools", Version: "v0.30.0", Subpath: "gopls"},
			wantQualified: "golang.org/x/tools",
			wantGo:        "golang.org/x/tools/gopls",
		},
		{
			name:          "golang with a nested subpath and slashes around it",
			id:            "pkg:golang/github.com/acme/tools@v1.2.0?type=module#/cmd/acme-ls/",
			want:          Purl{Type: "golang", Namespace: "github.com/acme", Name: "tools", Version: "v1.2.0", Subpath: "cmd/acme-ls"},
			wantQualified: "github.com/acme/tools",
			wantGo:        "github.com/acme/tools/cmd/acme-ls",
		},
		{
			name:          "golang without a subpath",
			id:            "pkg:golang/github.com/acme/acme-ls@v1.0.0",
			want:          Purl{Type: "golang", Namespace: "github.com/acme", Name: "acme-ls", Version: "v1.0.0"},
			wantQualified: "github.com/acme/acme-ls",
			wantGo:        "github.com/acme/acme-ls",
		},
		{
			name:          "github",
			id:            "pkg:github/LuaLS/lua-language-server@3.13.5",
			want:          Purl{Type: "github", Namespace: "LuaLS", Name: "lua-language-server", Version: "3.13.5"},
			wantQualified: "LuaLS/lua-language-server",
			wantGo:        "LuaLS/lua-language-server",
		},
		{
			name:          "generic",
			id:            "pkg:generic/eclipse/eclipse.jdt.ls@v1.40.0",
			want:          Purl{Type: "generic", Namespace: "eclipse", Name: "eclipse.jdt.ls", Version: "v1.40.0"},
			wantQualified: "eclipse/eclipse.jdt.ls",
			wantGo:        "eclipse/eclipse.jdt.ls",
		},
		{
			name:          "encoded version",
			id:            "pkg:github/rust-lang/rust-analyzer@2024-10-21%2Bnightly",
			want:          Purl{Type: "github", Namespace: "rust-lang", Name: "rust-analyzer", Version: "2024-10-21+nightly"},
			wantQualified: "rust-lang/rust-analyzer",
			wantGo:        "rust-lang/rust-analyzer",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := ParsePurl(c.id)
			if err != nil {
				t.Fatalf("ParsePurl(%q) = %v", c.id, err)
			}
			if got != c.want {
				t.Fatalf("ParsePurl(%q) = %+v, want %+v", c.id, got, c.want)
			}
			if qualified := got.QualifiedName(); qualified != c.wantQualified {
				t.Fatalf("QualifiedName() = %q, want %q", qualified, c.wantQualified)
			}
			if goPackage := got.GoPackage(); goPackage != c.wantGo {
				t.Fatalf("GoPackage() = %q, want %q", goPackage, c.wantGo)
			}
		})
	}
}

func TestParsePurlRejects(t *testing.T) {
	cases := []struct {
		name string
		id   string
		want string
	}{
		{name: "no scheme", id: "npm/pyright@1.1.390", want: "has no pkg: scheme"},
		{name: "other scheme", id: "purl:npm/pyright@1.1.390", want: "has no pkg: scheme"},
		{name: "no name", id: "pkg:npm", want: "has no name"},
		{name: "no version", id: "pkg:npm/pyright", want: "has no version"},
		{name: "empty version", id: "pkg:npm/pyright@", want: "has no version"},
		{name: "version only in the subpath", id: "pkg:golang/golang.org/x/tools#gopls@v1", want: "has no version"},
		{name: "invalid escape in the name", id: "pkg:npm/%zzpyright@1.1.390", want: "invalid URL escape"},
		{name: "invalid escape in the namespace", id: "pkg:npm/%4/language-server@1.0.0", want: "invalid URL escape"},
		{name: "invalid escape in the version", id: "pkg:npm/pyright@1.%g", want: "invalid URL escape"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := ParsePurl(c.id)
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("ParsePurl(%q) = %+v, %v, want an error containing %q", c.id, got, err, c.want)
			}
		})
	}
}
