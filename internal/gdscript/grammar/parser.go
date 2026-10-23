package grammar

import "github.com/msuozzo/bonsai"

const memoryCeilingPages = 1 << 20

func NewParser() *bonsai.Parser {
	memory := &bonsai.Memory{Max: memoryCeilingPages}
	memory.Grow(InitialPages, 0)
	module := New(&bonsai.HostEnv{Mem: memory})
	return bonsai.NewFromModule(module, memory, module.Xtree_sitter_gdscript())
}
