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

type Resolution struct {
	Install catalog.Install
	Skipped map[catalog.Platform]error
}

type installResolver struct {
	pkg  MasonPackage
	purl Purl
}

type masonFile struct {
	source string
	output string
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
	return Resolution{Install: catalog.Install{
		Type:          installType,
		Package:       pkg,
		Version:       r.purl.Version,
		ExtraPackages: r.pkg.Source.ExtraPackages,
		Bins:          bins,
	}}, nil
}

func (r installResolver) download() (Resolution, error) {
	key, value := r.source()
	variants := variantListOf(value)
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
		download, err := r.platformDownload(key, variant)
		if err != nil {
			skipped[platform] = err
			continue
		}
		platforms[platform] = download
	}
	if len(platforms) == 0 {
		return Resolution{}, fmt.Errorf("no downloads for oversee platforms")
	}
	return Resolution{
		Install: catalog.Install{
			Type:      catalog.InstallDownload,
			Package:   r.purl.QualifiedName(),
			Version:   r.purl.Version,
			Platforms: platforms,
		},
		Skipped: skipped,
	}, nil
}

func (r installResolver) source() (string, any) {
	if r.purl.Type == "github" {
		return "asset", r.pkg.Source.Asset
	}
	return "download", r.pkg.Source.Download
}

func (r installResolver) platformDownload(key string, variant map[string]any) (catalog.Download, error) {
	rendered, err := TemplateScope{"version": r.purl.Version}.RenderValue(variant)
	if err != nil {
		return catalog.Download{}, err
	}
	fields := rendered.(map[string]any)
	files, err := r.files(fields)
	if err != nil {
		return catalog.Download{}, err
	}
	if _, single := fields["file"].(string); single && len(files) == 1 {
		fields["file"] = path.Join(files[0].Dest, files[0].Name)
	}
	bins, err := r.bins(TemplateScope{"version": r.purl.Version, "source": map[string]any{key: fields}})
	if err != nil {
		return catalog.Download{}, err
	}
	return catalog.Download{Files: files, Bins: bins}, nil
}

func (r installResolver) files(fields map[string]any) ([]catalog.File, error) {
	if r.purl.Type == "generic" {
		return r.genericFiles(fields["files"])
	}
	specs := stringListOf(fields["file"])
	if len(specs) == 0 {
		return nil, fmt.Errorf("%s download has no file", r.purl.Type)
	}
	files := make([]catalog.File, 0, len(specs))
	for _, spec := range specs {
		file, err := masonFileOf(spec)
		if err != nil {
			return nil, err
		}
		files = append(files, file.catalogFile(r.fileURL(file.source)))
	}
	return files, nil
}

func (r installResolver) fileURL(name string) string {
	if r.purl.Type == "openvsx" {
		return "https://open-vsx.org/api/" + r.purl.Namespace + "/" + r.purl.Name + "/" + r.purl.Version + "/file/" + url.PathEscape(name)
	}
	return "https://github.com/" + r.purl.QualifiedName() + "/releases/download/" + r.purl.Version + "/" + url.PathEscape(name)
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
		output, ok := catalog.CleanPath(local)
		if !ok {
			return nil, fmt.Errorf("generic download %q leaves the install directory", local)
		}
		files = append(files, masonFile{output: output}.catalogFile(source))
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
		bin := binOf(rendered)
		if err := bin.Validate(); err != nil {
			return nil, fmt.Errorf("bin %s: %w", name, err)
		}
		bins[name] = bin
	}
	return bins, nil
}

func binOf(value string) catalog.Bin {
	kind, target, found := strings.Cut(value, ":")
	if !found {
		kind, target = string(catalog.BinExec), value
	}
	if clean, ok := catalog.CleanPath(target); ok {
		target = clean
	}
	return catalog.Bin{Kind: catalog.BinKind(kind), Path: target}
}

func masonFileOf(spec string) (masonFile, error) {
	source, dest, _ := strings.Cut(spec, ":")
	output := path.Base(source)
	switch {
	case strings.HasSuffix(dest, "/"):
		output = dest + output
	case dest != "":
		output = dest
	}
	clean, ok := catalog.CleanPath(output)
	if !ok {
		return masonFile{}, fmt.Errorf("file %q leaves the install directory", spec)
	}
	return masonFile{source: source, output: clean}, nil
}

func (f masonFile) catalogFile(link string) catalog.File {
	dest := path.Dir(f.output)
	if dest == "." {
		dest = ""
	}
	return catalog.File{URL: link, Name: path.Base(f.output), Dest: dest}
}
