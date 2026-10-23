package gdscript

import (
	"context"
	"crypto/sha256"
	"runtime"
	"sync"
	"time"

	"github.com/msuozzo/bonsai"
	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/gdscript/grammar"
)

const (
	MaxScriptBytes = 2 << 20
	MaxSceneBytes  = 8 << 20
	cacheLifetime  = 10 * time.Minute
)

type Source struct {
	Path    string
	Content []byte
}

type ProjectSources struct {
	Root     string
	Settings []byte
	Scripts  []Source
	Scenes   []Source
	Previous []Source
}

type cachedScript struct {
	script *Script
	used   time.Time
}

type Analyzer struct {
	mu      sync.Mutex
	scripts map[[sha256.Size]byte]*cachedScript
	expiry  *time.Timer
	slots   chan struct{}
	parsers sync.Pool
}

func NewAnalyzer() *Analyzer {
	return &Analyzer{
		scripts: map[[sha256.Size]byte]*cachedScript{},
		slots:   make(chan struct{}, runtime.GOMAXPROCS(0)),
		parsers: sync.Pool{New: func() any {
			return grammar.NewParser()
		}},
	}
}

func (a *Analyzer) Flow(ctx context.Context, sources ProjectSources, changes []domain.LineChanges) (domain.FlowGraph, error) {
	current, err := a.parseSources(ctx, sources.Scripts)
	if err != nil {
		return domain.FlowGraph{}, err
	}
	previous, err := a.parseSources(ctx, sources.Previous)
	if err != nil {
		return domain.FlowGraph{}, err
	}
	scenes := make(map[string]Scene, len(sources.Scenes))
	for _, scene := range sources.Scenes {
		scenes[scene.Path] = ParseScene(scene.Content)
	}
	project := NewProject(sources.Root, sources.Settings, current)
	flow := flowBuild{project: project, wiring: project.Wire(scenes), builder: domain.NewFlowBuilder(), nodes: map[string]functionKey{}}
	flow.addChangedFunctions(changes)
	flow.addCallEdges()
	flow.addSignalEdges()
	flow.addRemovedFunctions(previous, changes)
	flow.addOrigins()
	return flow.builder.Graph(), nil
}

type flowBuild struct {
	project *Project
	wiring  *Wiring
	builder *domain.FlowBuilder
	nodes   map[string]functionKey
}

func (f *flowBuild) addChangedFunctions(changes []domain.LineChanges) {
	for _, change := range changes {
		script, found := f.project.Script(change.Path)
		if !found || !change.HasSide(domain.FileSideNew) {
			continue
		}
		for _, function := range Functions(change.Path, script, f.project.DisplayName(change.Path)) {
			if !change.Touches(domain.FileSideNew, function.Unit.Span) {
				continue
			}
			key := keyOf(function.FunctionRef)
			function.Unit.Role = roleOf(function.Function.Name, f.wiring.isHandler(key))
			node := f.builder.AddUnit(change.Path, function.Unit, change.ChangeOf(function.Unit))
			f.nodes[node.ID] = key
		}
	}
}

func (f *flowBuild) nodeOf(key functionKey) (domain.FlowNode, bool) {
	return f.builder.NodeAt(key.path, key.function.NameAt.Line)
}

func (f *flowBuild) addCallEdges() {
	for target, callee := range f.nodes {
		for _, caller := range f.wiring.callers[callee] {
			if source, isNode := f.nodeOf(caller.caller); isNode {
				f.builder.AddEdge(domain.FlowEdge{From: source.ID, To: target, Line: caller.line, Via: domain.FlowViaCall})
			}
		}
	}
}

func (f *flowBuild) addSignalEdges() {
	for handler, wires := range f.wiring.wires {
		target, isNode := f.nodeOf(handler)
		if !isNode {
			continue
		}
		for _, connected := range wires {
			if connected.origin == nil {
				if source, connecting := f.nodeOf(connected.caller); connecting {
					f.builder.AddEdge(domain.FlowEdge{From: source.ID, To: target.ID, Line: connected.line, Via: domain.FlowViaConnect, Label: connected.label})
				}
			}
			if !connected.known {
				continue
			}
			for _, emitter := range f.wiring.emitters[connected.signal] {
				if source, emitting := f.nodeOf(emitter.caller); emitting {
					f.builder.AddEdge(domain.FlowEdge{From: source.ID, To: target.ID, Line: emitter.line, Via: domain.FlowViaSignal, Label: connected.label})
				}
			}
		}
	}
}

func (f *flowBuild) addRemovedFunctions(previous map[string]*Script, changes []domain.LineChanges) {
	for _, change := range changes {
		old, found := previous[change.Path]
		if !found || !change.HasSide(domain.FileSideOld) {
			continue
		}
		script, exists := f.project.Script(change.Path)
		if !exists && change.HasSide(domain.FileSideNew) {
			continue
		}
		var currentUnits []domain.FlowUnit
		if exists {
			for _, function := range Functions(change.Path, script, "") {
				currentUnits = append(currentUnits, function.Unit)
			}
		}
		var oldUnits []domain.FlowUnit
		for _, function := range Functions(change.Path, old, "") {
			function.Unit.Role = roleOf(function.Function.Name, false)
			oldUnits = append(oldUnits, function.Unit)
		}
		f.builder.AddRemovals(change, oldUnits, currentUnits, DisplayNameOf(change.File().OldPath(), old.ClassName))
	}
}

func (f *flowBuild) addOrigins() {
	for _, entry := range f.builder.EntryPoints() {
		key, found := f.nodes[entry.ID]
		if !found {
			continue
		}
		if text, callback := engineCallbacks[key.function.Name]; callback {
			f.builder.AddOrigin(entry.ID, domain.FlowOrigin{Name: text})
		}
		for _, connected := range f.wiring.wires[key] {
			if connected.origin != nil {
				f.builder.AddOrigin(entry.ID, *connected.origin)
			} else {
				f.addSiteOrigin(entry.ID, connected.site)
			}
			if connected.known {
				for _, emitter := range f.wiring.emitters[connected.signal] {
					f.addSiteOrigin(entry.ID, emitter)
				}
			}
		}
		for _, caller := range f.wiring.callers[key] {
			f.addSiteOrigin(entry.ID, caller)
		}
	}
}

func (f *flowBuild) addSiteOrigin(id string, origin site) {
	if _, isNode := f.nodeOf(origin.caller); isNode {
		return
	}
	function, found := f.wiring.functions[origin.caller]
	if !found {
		return
	}
	f.builder.AddOrigin(id, domain.FlowOrigin{Name: function.Unit.Name, Path: origin.caller.path, Line: origin.line})
}

type parseJob struct {
	paths  []string
	digest [sha256.Size]byte
	source []byte
}

func (a *Analyzer) parseSources(ctx context.Context, sources []Source) (map[string]*Script, error) {
	digests := make([][sha256.Size]byte, len(sources))
	for index, source := range sources {
		if len(source.Content) <= MaxScriptBytes {
			digests[index] = sha256.Sum256(source.Content)
		}
	}
	scripts := make(map[string]*Script, len(sources))
	var jobs []parseJob
	pending := map[[sha256.Size]byte]int{}
	a.mu.Lock()
	for index, source := range sources {
		if len(source.Content) > MaxScriptBytes {
			continue
		}
		digest := digests[index]
		if cached, found := a.scripts[digest]; found {
			cached.used = time.Now()
			scripts[source.Path] = cached.script
			continue
		}
		if queued, found := pending[digest]; found {
			jobs[queued].paths = append(jobs[queued].paths, source.Path)
			continue
		}
		pending[digest] = len(jobs)
		jobs = append(jobs, parseJob{paths: []string{source.Path}, digest: digest, source: source.Content})
	}
	a.mu.Unlock()
	parsed := a.parseAll(ctx, jobs)
	a.mu.Lock()
	defer a.mu.Unlock()
	for index, job := range jobs {
		script := parsed[index]
		if script == nil {
			continue
		}
		a.scripts[job.digest] = &cachedScript{script: script, used: time.Now()}
		for _, scriptPath := range job.paths {
			scripts[scriptPath] = script
		}
	}
	if a.expiry == nil && len(a.scripts) > 0 {
		a.expiry = time.AfterFunc(cacheLifetime, a.sweep)
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return scripts, nil
}

func (a *Analyzer) parseAll(ctx context.Context, jobs []parseJob) []*Script {
	parsed := make([]*Script, len(jobs))
	next := make(chan int)
	var workers sync.WaitGroup
	for range min(cap(a.slots), len(jobs)) {
		workers.Go(func() {
			for index := range next {
				parsed[index] = a.parseOne(jobs[index].source)
			}
		})
	}
	for index := range jobs {
		if ctx.Err() != nil {
			break
		}
		next <- index
	}
	close(next)
	workers.Wait()
	return parsed
}

func (a *Analyzer) parseOne(source []byte) *Script {
	a.slots <- struct{}{}
	defer func() {
		<-a.slots
	}()
	parser := a.parsers.Get().(*bonsai.Parser)
	script, err := Parse(parser, source)
	if err != nil {
		return nil
	}
	a.parsers.Put(parser)
	return script
}

func (a *Analyzer) sweep() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.expiry = nil
	now := time.Now()
	var next time.Time
	for digest, cached := range a.scripts {
		expires := cached.used.Add(cacheLifetime)
		if !expires.After(now) {
			delete(a.scripts, digest)
			continue
		}
		if next.IsZero() || expires.Before(next) {
			next = expires
		}
	}
	if !next.IsZero() {
		a.expiry = time.AfterFunc(time.Until(next), a.sweep)
	}
}
