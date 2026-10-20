package cataloggen

import (
	"fmt"
	"net/url"
	"strings"
)

type Purl struct {
	Type      string
	Namespace string
	Name      string
	Version   string
	Subpath   string
}

func ParsePurl(id string) (Purl, error) {
	rest, ok := strings.CutPrefix(id, "pkg:")
	if !ok {
		return Purl{}, fmt.Errorf("purl %q has no pkg: scheme", id)
	}
	rest, subpath, _ := strings.Cut(rest, "#")
	rest, _, _ = strings.Cut(rest, "?")
	kind, rest, ok := strings.Cut(rest, "/")
	if !ok {
		return Purl{}, fmt.Errorf("purl %q has no name", id)
	}
	rest, version, ok := strings.CutLast(rest, "@")
	if !ok || version == "" {
		return Purl{}, fmt.Errorf("purl %q has no version", id)
	}
	namespace, name, _ := strings.CutLast(rest, "/")
	if name == "" {
		namespace, name = "", rest
	}
	decoded := make([]string, 0, 3)
	for _, part := range []string{namespace, name, version} {
		value, err := url.PathUnescape(part)
		if err != nil {
			return Purl{}, fmt.Errorf("purl %q: %w", id, err)
		}
		decoded = append(decoded, value)
	}
	return Purl{
		Type:      kind,
		Namespace: decoded[0],
		Name:      decoded[1],
		Version:   decoded[2],
		Subpath:   strings.Trim(subpath, "/"),
	}, nil
}

func (p Purl) QualifiedName() string {
	if p.Namespace == "" {
		return p.Name
	}
	return p.Namespace + "/" + p.Name
}

func (p Purl) GoPackage() string {
	if p.Subpath == "" {
		return p.QualifiedName()
	}
	return p.QualifiedName() + "/" + p.Subpath
}
