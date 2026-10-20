package cataloggen

import (
	"fmt"
	"maps"
	"net/url"
	"path"
	"slices"
	"strings"

	"github.com/obsfx/oversee/internal/catalog"
)

var namedBinKinds = []catalog.BinKind{catalog.BinNpm, catalog.BinGolang}

var fileBinKinds = []catalog.BinKind{
	catalog.BinExec,
	catalog.BinNode,
	catalog.BinPython,
	catalog.BinJava,
	catalog.BinDotnet,
}

var installRequirements = map[catalog.InstallType][]catalog.Requirement{
	catalog.InstallNpm:    {catalog.RequiresNode, catalog.RequiresNpm},
	catalog.InstallGolang: {catalog.RequiresGo},
}

var binRequirements = map[catalog.BinKind]catalog.Requirement{
	catalog.BinNpm:    catalog.RequiresNode,
	catalog.BinNode:   catalog.RequiresNode,
	catalog.BinPython: catalog.RequiresPython,
	catalog.BinJava:   catalog.RequiresJava,
	catalog.BinDotnet: catalog.RequiresDotnet,
}

type Resolution struct {
	Install  catalog.Install
	Requires []catalog.Requirement
	Skipped  map[catalog.Platform]error
}

type installResolver struct {
	pkg  MasonPackage
	purl Purl
}

func (r installResolver) Resolve() (Resolution, error) {
	switch r.purl.Type {
	case "npm":
		return r.named(catalog.InstallNpm, r.purl.QualifiedName())
	case "golang":
		return r.named(catalog.InstallGolang, r.purl.GoPackage())
	case "github", "generic", "openvsx":
		return r.download()
	default:
		return Resolution{}, fmt.Errorf("unsupported source type %q", r.purl.Type)
	}
}

func (r installResolver) named(installType catalog.InstallType, pkg string) (Resolution, error) {
	bins, err := r.bins(TemplateScope{"version": r.purl.Version})
	if err != nil {
		return Resolution{}, err
	}
	install := catalog.Install{
		Type:          installType,
		Package:       pkg,
		Version:       r.purl.Version,
		ExtraPackages: r.pkg.Source.ExtraPackages,
		Bins:          bins,
	}
	return Resolution{Install: install, Requires: requirementsOf(install)}, nil
}

func (r installResolver) download() (Resolution, error) {
	variants := variantListOf(r.variants())
	if len(variants) == 0 {
		return Resolution{}, fmt.Errorf("%s source has no downloads", r.purl.Type)
	}
	supported := targetSet(r.pkg.Source.SupportedPlatforms)
	platforms := map[catalog.Platform]catalog.Download{}
	skipped := map[catalog.Platform]error{}
	for _, platform := range catalog.Platforms {
		if !supported.Matches(platform) {
			continue
		}
		variant, ok := variants.For(platform)
		if !ok {
			continue
		}
		download, err := r.platformDownload(variant)
		if err != nil {
			skipped[platform] = err
			continue
		}
		platforms[platform] = download
	}
	if len(platforms) == 0 {
		return Resolution{}, fmt.Errorf("no downloads for oversee platforms")
	}
	install := catalog.Install{
		Type:      catalog.InstallDownload,
		Package:   r.purl.QualifiedName(),
		Version:   r.purl.Version,
		Platforms: platforms,
	}
	return Resolution{Install: install, Requires: requirementsOf(install), Skipped: skipped}, nil
}

func (r installResolver) variants() any {
	if r.purl.Type == "github" {
		return r.pkg.Source.Asset
	}
	return r.pkg.Source.Download
}

func (r installResolver) variantKey() string {
	if r.purl.Type == "github" {
		return "asset"
	}
	return "download"
}

func (r installResolver) platformDownload(variant map[string]any) (catalog.Download, error) {
	rendered, err := TemplateScope{"version": r.purl.Version}.RenderValue(variant)
	if err != nil {
		return catalog.Download{}, err
	}
	fields := rendered.(map[string]any)
	files, err := r.files(fields)
	if err != nil {
		return catalog.Download{}, err
	}
	bins, err := r.bins(TemplateScope{"version": r.purl.Version, "source": map[string]any{r.variantKey(): fields}})
	if err != nil {
		return catalog.Download{}, err
	}
	return catalog.Download{Files: files, Bins: bins}, nil
}

func (r installResolver) files(fields map[string]any) ([]catalog.File, error) {
	switch r.purl.Type {
	case "github":
		return r.githubFiles(fields["file"])
	case "openvsx":
		return r.openVsxFiles(fields["file"])
	default:
		return r.genericFiles(fields["files"])
	}
}

func (r installResolver) githubFiles(value any) ([]catalog.File, error) {
	specs := stringListOf(value)
	if len(specs) == 0 {
		return nil, fmt.Errorf("github asset has no file")
	}
	files := make([]catalog.File, 0, len(specs))
	for _, spec := range specs {
		name, dest, _ := strings.Cut(spec, ":")
		cleanDest, err := relativePath(dest)
		if err != nil {
			return nil, err
		}
		files = append(files, catalog.File{
			URL:  "https://github.com/" + r.purl.QualifiedName() + "/releases/download/" + r.purl.Version + "/" + url.PathEscape(name),
			Name: path.Base(name),
			Dest: cleanDest,
		})
	}
	return files, nil
}

func (r installResolver) openVsxFiles(value any) ([]catalog.File, error) {
	name, ok := value.(string)
	if !ok || name == "" {
		return nil, fmt.Errorf("openvsx download has no file")
	}
	return []catalog.File{{
		URL:  "https://open-vsx.org/api/" + r.purl.Namespace + "/" + r.purl.Name + "/" + r.purl.Version + "/file/" + url.PathEscape(name),
		Name: path.Base(name),
	}}, nil
}

func (r installResolver) genericFiles(value any) ([]catalog.File, error) {
	entries, ok := value.(map[string]any)
	if !ok || len(entries) == 0 {
		return nil, fmt.Errorf("generic download has no files")
	}
	files := make([]catalog.File, 0, len(entries))
	for _, local := range slices.Sorted(maps.Keys(entries)) {
		source, ok := entries[local].(string)
		if !ok {
			return nil, fmt.Errorf("generic download %q has no url", local)
		}
		dest, err := relativePath(path.Dir(local))
		if err != nil {
			return nil, err
		}
		files = append(files, catalog.File{URL: source, Name: path.Base(local), Dest: dest})
	}
	return files, nil
}

func (r installResolver) bins(scope TemplateScope) (map[string]catalog.Bin, error) {
	bins := make(map[string]catalog.Bin, len(r.pkg.Bin))
	for name, value := range r.pkg.Bin {
		rendered, err := scope.Render(value)
		if err != nil {
			return nil, fmt.Errorf("bin %s: %w", name, err)
		}
		bin, err := parseBin(rendered)
		if err != nil {
			return nil, fmt.Errorf("bin %s: %w", name, err)
		}
		bins[name] = bin
	}
	return bins, nil
}

func parseBin(value string) (catalog.Bin, error) {
	kind, target, found := strings.Cut(value, ":")
	if !found {
		kind, target = string(catalog.BinExec), value
	}
	binKind := catalog.BinKind(kind)
	if slices.Contains(namedBinKinds, binKind) {
		if target == "" || strings.ContainsAny(target, `/\`) {
			return catalog.Bin{}, fmt.Errorf("invalid %s bin name %q", kind, target)
		}
		return catalog.Bin{Kind: binKind, Path: target}, nil
	}
	if !slices.Contains(fileBinKinds, binKind) {
		return catalog.Bin{}, fmt.Errorf("unsupported bin kind %q", kind)
	}
	clean, err := relativePath(target)
	if err != nil || clean == "" {
		return catalog.Bin{}, fmt.Errorf("invalid %s bin path %q", kind, target)
	}
	return catalog.Bin{Kind: binKind, Path: clean}, nil
}

func relativePath(value string) (string, error) {
	if value == "" || value == "." {
		return "", nil
	}
	clean := path.Clean(value)
	if path.IsAbs(clean) || clean == ".." || strings.HasPrefix(clean, "../") {
		return "", fmt.Errorf("path %q leaves the install directory", value)
	}
	return clean, nil
}

func requirementsOf(install catalog.Install) []catalog.Requirement {
	required := map[catalog.Requirement]bool{}
	for _, requirement := range installRequirements[install.Type] {
		required[requirement] = true
	}
	for bins := range install.BinSets() {
		for _, bin := range bins {
			if requirement, ok := binRequirements[bin.Kind]; ok {
				required[requirement] = true
			}
		}
	}
	return slices.Sorted(maps.Keys(required))
}
