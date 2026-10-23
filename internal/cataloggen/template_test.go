package cataloggen

import (
	"reflect"
	"strings"
	"testing"
)

func testScope() TemplateScope {
	return TemplateScope{
		"version": "v1.2.3",
		"source": map[string]any{
			"asset": map[string]any{
				"file":  "libexec/tool-v1.2.3.tar.gz",
				"bin":   "libexec/bin/tool",
				"count": 2.0,
				"list":  []any{"a", "b"},
			},
		},
	}
}

func TestTemplateScopeRender(t *testing.T) {
	cases := []struct {
		name string
		text string
		want string
	}{
		{name: "plain text", text: "bin/tool", want: "bin/tool"},
		{name: "empty text", text: "", want: ""},
		{name: "closing braces without an opening", text: "a}}b", want: "a}}b"},
		{name: "top level field", text: "tool-{{version}}.zip", want: "tool-v1.2.3.zip"},
		{name: "spaces inside the braces", text: "{{ version }}", want: "v1.2.3"},
		{name: "nested field", text: "exec:{{source.asset.bin}}", want: "exec:libexec/bin/tool"},
		{name: "several expressions", text: "{{version}}/{{ source.asset.file }}/{{version}}", want: "v1.2.3/libexec/tool-v1.2.3.tar.gz/v1.2.3"},
		{name: "strip_prefix", text: `tool-{{ version | strip_prefix "v" }}`, want: "tool-1.2.3"},
		{name: "strip_prefix without spaces", text: `{{version|strip_prefix "v"}}`, want: "1.2.3"},
		{name: "strip_prefix that does not match", text: `{{ source.asset.bin | strip_prefix "bin/" }}`, want: "libexec/bin/tool"},
		{name: "chained strip_prefix", text: `{{ version | strip_prefix "v" | strip_prefix "1." }}`, want: "2.3"},
		{name: "strip_prefix with an escape sequence", text: `{{ version | strip_prefix "v1." }}`, want: "2.3"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := testScope().Render(c.text)
			if err != nil {
				t.Fatalf("Render(%q) = %v", c.text, err)
			}
			if got != c.want {
				t.Fatalf("Render(%q) = %q, want %q", c.text, got, c.want)
			}
		})
	}
}

func TestTemplateScopeRenderFails(t *testing.T) {
	cases := []struct {
		name string
		text string
		want string
	}{
		{name: "missing field", text: "{{missing}}", want: `"missing" has no "missing"`},
		{name: "missing nested field", text: "exec:{{source.asset.exe}}", want: `"source.asset.exe" has no "exe"`},
		{name: "missing object", text: "{{source.download.file}}", want: `"source.download.file" has no "download"`},
		{name: "empty expression", text: "{{}}", want: "invalid path"},
		{name: "empty segment", text: "{{source..file}}", want: `invalid path "source..file"`},
		{name: "trailing dot", text: "{{version.}}", want: "invalid path"},
		{name: "segment starting with a digit", text: "{{ 1version }}", want: "invalid path"},
		{name: "segment with a dash", text: "{{source.asset-file}}", want: "invalid path"},
		{name: "index expression", text: "{{source.asset.list[0]}}", want: "invalid path"},
		{name: "field of a string", text: "{{version.major}}", want: `"version.major" is not an object at "major"`},
		{name: "object value", text: "{{source.asset}}", want: `"source.asset" is not a string`},
		{name: "number value", text: "{{source.asset.count}}", want: `"source.asset.count" is not a string`},
		{name: "list value", text: "{{source.asset.list}}", want: `"source.asset.list" is not a string`},
		{name: "unknown filter", text: "{{ version | upper }}", want: `unknown filter "upper"`},
		{name: "empty filter", text: "{{ version | }}", want: `unknown filter ""`},
		{name: "unquoted strip_prefix argument", text: "{{ version | strip_prefix v }}", want: "strip_prefix argument"},
		{name: "strip_prefix without an argument", text: "{{ version | strip_prefix }}", want: "strip_prefix argument"},
		{name: "unclosed expression", text: "tool-{{version", want: "has an unclosed expression"},
		{name: "error after a valid expression", text: "{{version}}-{{missing}}", want: `has no "missing"`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := testScope().Render(c.text)
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("Render(%q) = %q, %v, want an error containing %q", c.text, got, err, c.want)
			}
			if !strings.Contains(err.Error(), c.text) {
				t.Fatalf("Render(%q) error %q does not name the template", c.text, err)
			}
		})
	}
}

func TestTemplateScopeRenderValue(t *testing.T) {
	value := map[string]any{
		"target": []any{"darwin_arm64", "linux_x64"},
		"file":   "tool-{{version}}.tar.gz:libexec/",
		"files": map[string]any{
			"tool-{{version}}.jar": `https://example.com/{{ version | strip_prefix "v" }}/tool.jar`,
		},
		"nested": []any{map[string]any{"bin": "{{source.asset.bin}}"}, true, 3.0, nil},
		"flag":   false,
	}
	got, err := testScope().RenderValue(value)
	if err != nil {
		t.Fatalf("RenderValue() = %v", err)
	}
	want := map[string]any{
		"target": []any{"darwin_arm64", "linux_x64"},
		"file":   "tool-v1.2.3.tar.gz:libexec/",
		"files": map[string]any{
			"tool-v1.2.3.jar": "https://example.com/1.2.3/tool.jar",
		},
		"nested": []any{map[string]any{"bin": "libexec/bin/tool"}, true, 3.0, nil},
		"flag":   false,
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("RenderValue() = %v, want %v", got, want)
	}
	if value["file"] != "tool-{{version}}.tar.gz:libexec/" {
		t.Fatalf("RenderValue() changed its input to %v", value["file"])
	}
}

func TestTemplateScopeRenderValueFails(t *testing.T) {
	cases := []struct {
		name  string
		value any
		want  string
	}{
		{name: "string", value: "{{missing}}", want: `has no "missing"`},
		{name: "list item", value: []any{"ok", "{{missing}}"}, want: `has no "missing"`},
		{name: "map value", value: map[string]any{"file": "{{source.asset.exe}}"}, want: `has no "exe"`},
		{name: "map key", value: map[string]any{"{{missing}}.jar": "https://example.com/tool.jar"}, want: `has no "missing"`},
		{name: "nested list in a map", value: map[string]any{"targets": []any{"{{version | upper}}"}}, want: `unknown filter "upper"`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := testScope().RenderValue(c.value)
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("RenderValue() = %v, %v, want an error containing %q", got, err, c.want)
			}
		})
	}
}
