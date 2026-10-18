package webui

import (
	"bytes"
	"compress/gzip"
	"embed"
	"errors"
	"io"
	"io/fs"
	"sync"
)

//go:embed all:dist
var dist embed.FS

const indexPath = "dist/index.html.gz"

var ErrNotBuilt = errors.New("ui shell is not built, run `pnpm build:ui`")

var Index = sync.OnceValues(func() ([]byte, error) {
	compressed, err := dist.ReadFile(indexPath)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, ErrNotBuilt
	}
	if err != nil {
		return nil, err
	}
	reader, err := gzip.NewReader(bytes.NewReader(compressed))
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	return io.ReadAll(reader)
})
