package service

import (
	"context"
	"errors"
	"maps"
	"path/filepath"
	"slices"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/lsp"
)

type flowTarget struct {
	file     string
	position lsp.Position
	plain    bool
}

type flowSymbol struct {
	uri      string
	position lsp.Position
}

type flowWalk struct {
	service         *ChangeFlowService
	group           flowGroup
	capabilities    lsp.Capabilities
	builder         *domain.FlowBuilder
	opened          map[string]bool
	repo            map[string]bool
	targets         map[string]flowTarget
	items           map[string]lsp.CallItem
	implementations map[flowSymbol][]lsp.Location
	units           map[string][]domain.FlowUnit
	relatives       map[string]string
	trace           flowTrace
	crossings       []domain.FlowEdge
	gaps            bool
	retry           bool
}

func (w *flowWalk) run(batch *lsp.Batch) error {
	w.targets = map[string]flowTarget{}
	w.items = map[string]lsp.CallItem{}
	w.implementations = map[flowSymbol][]lsp.Location{}
	w.units = map[string][]domain.FlowUnit{}
	w.relatives = map[string]string{}
	w.trace = newFlowTrace(w.group.tally)
	steps := []func(*lsp.Batch) error{w.collect}
	if w.capabilities.CallHierarchy {
		steps = append(steps, w.prepare, w.connect, w.originate)
	}
	for _, step := range steps {
		if err := step(batch); err != nil {
			return err
		}
	}
	return nil
}

func (w *flowWalk) missed(err error) {
	w.gaps = true
	w.retry = w.retry || lsp.IsRetryable(err)
}

func (w *flowWalk) incomplete(indexing bool) bool {
	return w.retry || w.gaps && indexing
}

func (w *flowWalk) collect(batch *lsp.Batch) error {
	for _, file := range w.group.files {
		absolute := w.service.documentPath(file.Path, domain.FileSideNew)
		if !w.opened[absolute] {
			continue
		}
		units, err := unitsOf(batch, absolute)
		if aborted(err) {
			return err
		}
		w.group.tally.read()
		if err != nil {
			w.missed(err)
			continue
		}
		w.units[file.Path] = units
		for _, unit := range file.TouchedUnits(domain.FileSideNew, units) {
			node := w.builder.AddUnit(file.Path, unit, file.ChangeOf(unit))
			if unit.NameUnknown {
				continue
			}
			w.targets[node.ID] = flowTarget{
				file:     absolute,
				position: lsp.Position{Line: unit.NameAt.Line - 1, Character: unit.NameAt.Character},
				plain:    unit.PlainValue(file.Path),
			}
		}
	}
	return nil
}

func (w *flowWalk) removed(batch *lsp.Batch) error {
	for _, file := range w.group.files {
		previous := w.service.documentPath(file.Path, domain.FileSideOld)
		if !file.Opens(domain.FileSideOld) || !w.opened[previous] {
			continue
		}
		current, collected := w.units[file.Path]
		if file.HasSide(domain.FileSideNew) && !collected {
			continue
		}
		units, err := unitsOf(batch, previous)
		if aborted(err) {
			return err
		}
		if err != nil {
			w.missed(err)
			continue
		}
		w.builder.AddRemovals(file, units, current, "")
	}
	return nil
}

func unitsOf(batch *lsp.Batch, file string) ([]domain.FlowUnit, error) {
	symbols, err := batch.Symbols(file)
	if err != nil {
		return nil, err
	}
	return domain.UnitsOf(symbols), nil
}

func (w *flowWalk) prepare(batch *lsp.Batch) error {
	w.group.tally.tracing(len(w.targets))
	for _, id := range slices.Sorted(maps.Keys(w.targets)) {
		target := w.targets[id]
		items, err := batch.PrepareCallHierarchy(target.file, target.position)
		if aborted(err) {
			return err
		}
		if err != nil || len(items) == 0 {
			w.missed(err)
			if target.plain {
				w.builder.Remove(id)
			}
			delete(w.targets, id)
			w.trace.finish(id)
			continue
		}
		w.items[id] = items[0]
	}
	return nil
}

func (w *flowWalk) connect(batch *lsp.Batch) error {
	for _, id := range slices.Sorted(maps.Keys(w.items)) {
		calls, err := batch.OutgoingCalls(w.items[id])
		if aborted(err) {
			return err
		}
		if err != nil {
			w.missed(err)
			w.trace.walk(id)
			continue
		}
		for _, call := range calls {
			if err := w.link(batch, id, call); err != nil {
				return err
			}
		}
		w.trace.walk(id)
	}
	return nil
}

func (w *flowWalk) link(batch *lsp.Batch, from string, call lsp.Call) error {
	relative, inRepo := w.repoPathOf(call.Item.URI)
	if !inRepo {
		return nil
	}
	line := call.Line()
	w.join(domain.FlowEdge{From: from, To: domain.FlowNodeID(relative, call.Item.Selection.Start.Line+1), Line: line, Via: domain.FlowViaCall})
	if !w.capabilities.Implementation || !call.Item.Kind.CanHaveImplementations() {
		return nil
	}
	locations, err := w.implementationsOf(batch, call.Item)
	if err != nil {
		return err
	}
	for _, location := range locations {
		if relative, inRepo := w.repoPathOf(location.URI); inRepo {
			w.join(domain.FlowEdge{From: from, To: domain.FlowNodeID(relative, location.Range.Start.Line+1), Line: line, Via: domain.FlowViaImplementation})
		}
	}
	return nil
}

func (w *flowWalk) join(edge domain.FlowEdge) {
	if !w.builder.Has(edge.To) {
		w.crossings = append(w.crossings, edge)
		return
	}
	w.builder.AddEdge(edge)
	if edge.From != edge.To {
		w.trace.call(edge.To)
	}
}

func (w *flowWalk) implementationsOf(batch *lsp.Batch, item lsp.CallItem) ([]lsp.Location, error) {
	key := flowSymbol{uri: item.URI, position: item.Selection.Start}
	if cached, found := w.implementations[key]; found {
		return cached, nil
	}
	file, err := lsp.PathOf(item.URI)
	if err != nil {
		return nil, nil
	}
	locations, err := batch.Implementation(file, item.Selection.Start)
	if aborted(err) {
		return nil, err
	}
	if err != nil {
		w.missed(err)
		return nil, nil
	}
	w.implementations[key] = locations
	return locations, nil
}

func (w *flowWalk) originate(batch *lsp.Batch) error {
	for _, entry := range w.builder.EntryPoints() {
		item, found := w.items[entry.ID]
		if !found {
			continue
		}
		if err := w.originsOf(batch, entry.ID, item); err != nil {
			return err
		}
		w.trace.finish(entry.ID)
	}
	return nil
}

func (w *flowWalk) originsOf(batch *lsp.Batch, id string, item lsp.CallItem) error {
	calls, err := batch.IncomingCalls(item)
	if aborted(err) {
		return err
	}
	if err != nil {
		w.missed(err)
	}
	for _, call := range calls {
		w.builder.AddOrigin(id, w.origin(call.Item.Name, call.Item.URI, call.Line()))
	}
	if len(calls) > 0 || !w.capabilities.References {
		return nil
	}
	target := w.targets[id]
	references, err := batch.References(target.file, target.position)
	if aborted(err) {
		return err
	}
	if err != nil {
		w.missed(err)
	}
	for _, reference := range references {
		file, err := lsp.PathOf(reference.URI)
		if err != nil {
			continue
		}
		w.builder.AddOrigin(id, w.origin(filepath.Base(file), reference.URI, reference.Range.Start.Line+1))
	}
	return nil
}

func (w *flowWalk) origin(name, uri string, line int) domain.FlowOrigin {
	relative, _ := w.relativeOf(uri)
	return domain.FlowOrigin{Name: name, Path: relative, Line: line}
}

func (w *flowWalk) relativeOf(uri string) (string, bool) {
	relative, cached := w.relatives[uri]
	if !cached {
		if file, err := lsp.PathOf(uri); err == nil {
			relative, _ = w.service.project.Relative(file)
		}
		w.relatives[uri] = relative
	}
	return relative, relative != ""
}

func (w *flowWalk) repoPathOf(uri string) (string, bool) {
	relative, _ := w.relativeOf(uri)
	return relative, w.repo[relative]
}

func aborted(err error) bool {
	return errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) || errors.Is(err, lsp.ErrClosed)
}
