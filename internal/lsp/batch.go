package lsp

import (
	"context"
	"encoding/json/jsontext"

	"github.com/obsfx/oversee/internal/domain"
)

type Batch struct {
	ctx    context.Context
	client *Client
	opened []string
	texts  map[string]string
	synced uint64
}

func (b *Batch) Symbols(path string) ([]domain.CodeSymbol, error) {
	params := documentParams{TextDocument: textDocumentIdentifier{URI: FileURI(path)}}
	return b.request("textDocument/documentSymbol", params, parseSymbols)
}

func (b *Batch) PrepareCallHierarchy(path string, position Position) ([]CallItem, error) {
	return b.request("textDocument/prepareCallHierarchy", position.in(path), parseCallItems)
}

func (b *Batch) OutgoingCalls(item CallItem) ([]Call, error) {
	return b.request("callHierarchy/outgoingCalls", callItemParams{Item: item.raw}, func(raw jsontext.Value) ([]Call, error) {
		return parseCalls(raw, true)
	})
}

func (b *Batch) IncomingCalls(item CallItem) ([]Call, error) {
	return b.request("callHierarchy/incomingCalls", callItemParams{Item: item.raw}, func(raw jsontext.Value) ([]Call, error) {
		return parseCalls(raw, false)
	})
}

func (b *Batch) Implementation(path string, position Position) ([]Location, error) {
	return b.request("textDocument/implementation", position.in(path), parseLocations)
}

func (b *Batch) References(path string, position Position) ([]Location, error) {
	params := referenceParams{
		TextDocument: textDocumentIdentifier{URI: FileURI(path)},
		Position:     position,
		Context:      referenceContext{IncludeDeclaration: false},
	}
	return b.request("textDocument/references", params, parseLocations)
}

func (b *Batch) request[T any](method string, params any, parse func(jsontext.Value) (T, error)) (T, error) {
	var raw jsontext.Value
	if err := b.call(method, params, &raw); err != nil {
		var zero T
		return zero, err
	}
	return parse(raw)
}

func (b *Batch) open(documents []Document) error {
	release, err := b.client.acquire(b.ctx)
	if err != nil {
		return err
	}
	defer release()
	for _, document := range documents {
		if err := b.ctx.Err(); err != nil {
			return err
		}
		uri := FileURI(document.Path)
		if _, held := b.texts[uri]; held {
			continue
		}
		b.opened = append(b.opened, uri)
		b.texts[uri] = document.Text
		if err := b.client.hold(uri, document); err != nil {
			return err
		}
	}
	b.synced = b.client.replaced
	return nil
}

func (b *Batch) call(method string, params, result any) error {
	release, err := b.client.acquire(b.ctx)
	if err != nil {
		return err
	}
	defer release()
	if err := b.sync(); err != nil {
		return err
	}
	return b.client.conn.Call(b.ctx, method, params, result)
}

func (b *Batch) sync() error {
	if b.synced == b.client.replaced {
		return nil
	}
	for _, uri := range b.opened {
		if err := b.client.replace(uri, b.client.documents[uri], b.texts[uri]); err != nil {
			return err
		}
	}
	b.synced = b.client.replaced
	return nil
}

func (b *Batch) close() {
	if len(b.opened) == 0 {
		return
	}
	release := b.client.wait()
	defer release()
	for _, uri := range b.opened {
		b.client.release(uri)
	}
}
