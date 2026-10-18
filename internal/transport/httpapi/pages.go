package httpapi

import (
	"bytes"
	"compress/gzip"
	"sync"
)

type renderedPage struct {
	raw     []byte
	gzipped []byte
}

type pageCache struct {
	pages sync.Map
}

func (c *pageCache) get(host string, render func() ([]byte, error)) (renderedPage, error) {
	loader, _ := c.pages.LoadOrStore(host, sync.OnceValues(func() (renderedPage, error) {
		raw, err := render()
		if err != nil {
			return renderedPage{}, err
		}
		gzipped, err := compress(raw)
		return renderedPage{raw: raw, gzipped: gzipped}, err
	}))
	return loader.(func() (renderedPage, error))()
}

func compress(content []byte) ([]byte, error) {
	var buffer bytes.Buffer
	writer, err := gzip.NewWriterLevel(&buffer, gzip.BestSpeed)
	if err != nil {
		return nil, err
	}
	if _, err := writer.Write(content); err != nil {
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
