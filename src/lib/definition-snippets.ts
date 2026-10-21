import type { SnapshotLine } from '@/src/lib/comment-gateway.ts'
import type { Definition } from '@/src/lib/definition-gateway.ts'

export abstract class DefinitionSnippets {
  private static readonly heads = new WeakMap<Definition, SnapshotLine[]>()

  static head(definition: Definition) {
    const cached = DefinitionSnippets.heads.get(definition)
    if (cached) {
      return cached
    }
    const head = definition.snippet.lines.slice(0, 1).map((text) => {
      return { number: definition.snippet.startLine, text }
    })
    DefinitionSnippets.heads.set(definition, head)
    return head
  }
}
