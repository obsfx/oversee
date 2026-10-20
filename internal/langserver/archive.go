package langserver

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/ulikunitz/xz"
)

const linkTargetLimit = 4096

func extractArchive(path string) error {
	name := filepath.Base(path)
	var err error
	switch {
	case strings.HasSuffix(name, ".zip"), strings.HasSuffix(name, ".vsix"):
		err = withRoot(filepath.Dir(path), func(root *os.Root) error {
			return unzip(path, root)
		})
	case strings.HasSuffix(name, ".tar.gz"), strings.HasSuffix(name, ".tgz"):
		err = untarFile(path, func(r io.Reader) (io.Reader, error) {
			return gzip.NewReader(r)
		})
	case strings.HasSuffix(name, ".tar.xz"):
		err = untarFile(path, func(r io.Reader) (io.Reader, error) {
			return xz.NewReader(r)
		})
	case strings.HasSuffix(name, ".gz"):
		err = gunzip(path, strings.TrimSuffix(path, ".gz"))
	default:
		return nil
	}
	if err != nil {
		return fmt.Errorf("extract %s: %w", name, err)
	}
	return os.Remove(path)
}

func withRoot(dir string, work func(root *os.Root) error) error {
	root, err := os.OpenRoot(dir)
	if err != nil {
		return err
	}
	defer root.Close()
	return work(root)
}

func unzip(path string, root *os.Root) error {
	reader, err := zip.OpenReader(path)
	if err != nil {
		return err
	}
	defer reader.Close()
	for _, file := range reader.File {
		if err := unzipEntry(root, file); err != nil {
			return err
		}
	}
	return nil
}

func unzipEntry(root *os.Root, file *zip.File) error {
	name, err := localName(file.Name)
	if err != nil {
		return err
	}
	mode := file.Mode()
	if mode.IsDir() {
		return root.MkdirAll(name, 0o755)
	}
	content, err := file.Open()
	if err != nil {
		return err
	}
	defer content.Close()
	if mode&fs.ModeSymlink != 0 {
		target, err := io.ReadAll(io.LimitReader(content, linkTargetLimit))
		if err != nil {
			return err
		}
		return symlink(root, name, string(target))
	}
	return writeEntry(root, name, content, mode.Perm())
}

func untarFile(path string, decompress func(io.Reader) (io.Reader, error)) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	stream, err := decompress(file)
	if err != nil {
		return err
	}
	return withRoot(filepath.Dir(path), func(root *os.Root) error {
		return untar(tar.NewReader(stream), root)
	})
}

func untar(reader *tar.Reader, root *os.Root) error {
	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return err
		}
		name, err := localName(header.Name)
		if err != nil {
			return err
		}
		switch header.Typeflag {
		case tar.TypeDir:
			err = root.MkdirAll(name, 0o755)
		case tar.TypeReg:
			err = writeEntry(root, name, reader, fs.FileMode(header.Mode).Perm())
		case tar.TypeSymlink:
			err = symlink(root, name, header.Linkname)
		}
		if err != nil {
			return err
		}
	}
}

func gunzip(source, target string) error {
	in, err := os.Open(source)
	if err != nil {
		return err
	}
	defer in.Close()
	stream, err := gzip.NewReader(in)
	if err != nil {
		return err
	}
	out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(out, stream)
	return errors.Join(copyErr, out.Close())
}

func writeEntry(root *os.Root, name string, content io.Reader, perm fs.FileMode) error {
	if dir := filepath.Dir(name); dir != "." {
		if err := root.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	if perm == 0 {
		perm = 0o644
	}
	out, err := root.OpenFile(name, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, perm|0o600)
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(out, content)
	return errors.Join(copyErr, out.Close())
}

func symlink(root *os.Root, name, target string) error {
	native := filepath.Clean(filepath.FromSlash(target))
	rooted := strings.HasPrefix(target, "/") || strings.HasPrefix(native, string(filepath.Separator))
	if rooted || filepath.IsAbs(native) || filepath.VolumeName(native) != "" || !filepath.IsLocal(filepath.Join(filepath.Dir(name), native)) {
		return fmt.Errorf("link %s points outside the install directory", name)
	}
	if err := requireRealParents(root, name); err != nil {
		return err
	}
	if dir := filepath.Dir(name); dir != "." {
		if err := root.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	return root.Symlink(native, name)
}

func requireRealParents(root *os.Root, name string) error {
	for dir := filepath.Dir(name); dir != "."; dir = filepath.Dir(dir) {
		info, err := root.Lstat(dir)
		if errors.Is(err, fs.ErrNotExist) {
			continue
		}
		if err != nil {
			return err
		}
		if info.Mode()&fs.ModeSymlink != 0 {
			return fmt.Errorf("link %s is created through the link %s", name, dir)
		}
	}
	return nil
}

func localName(name string) (string, error) {
	clean := filepath.FromSlash(strings.TrimSuffix(name, "/"))
	if !filepath.IsLocal(clean) {
		return "", fmt.Errorf("archive entry %q leaves the install directory", name)
	}
	return clean, nil
}
