import { ResourceStates, type ResourceState } from '@/src/lib/async-resource.ts'
import type { CallFlowGraph } from '@/src/lib/call-flow.ts'
import type { ChangeFlow } from '@/src/lib/change-flow-gateway.ts'
import type { ChangeFlows } from '@/src/lib/change-flows.ts'
import { ChangeSets, type FileChange } from '@/src/lib/change-set.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import {
  FollowedChangeSetWatch,
  type FollowedChangeSetSources,
  type FollowedComparison,
} from '@/src/lib/followed-change-set-watch.ts'
import type { SymbolHighlight } from '@/src/lib/symbol-highlight.ts'

export interface SymbolHighlightPort {
  current(): SymbolHighlight | null
  clear(): void
  subscribe(listener: () => void): () => void
}

export interface SymbolHighlightSources extends FollowedChangeSetSources {
  changeFlows: ChangeFlows
}

interface HighlightAnchor {
  highlight: SymbolHighlight
  revision: string
}

export class SymbolHighlightSync {
  private readonly watch: FollowedChangeSetWatch
  private readonly changeFlows: ChangeFlows
  private readonly highlight: SymbolHighlightPort
  private changes: readonly FileChange[] | null = null
  private anchor: HighlightAnchor | null = null
  private releaseFlow: (() => void) | null = null

  constructor(
    sources: SymbolHighlightSources,
    comparison: FollowedComparison,
    highlight: SymbolHighlightPort,
  ) {
    this.watch = new FollowedChangeSetWatch(sources, comparison)
    this.changeFlows = sources.changeFlows
    this.highlight = highlight
  }

  start() {
    const stopWatching = this.watch.start({
      change: (comparison, state) => {
        this.changes = state.status === 'ready' ? state.data.changes : null
        if (this.releaseFlow === null) {
          this.followFlow(comparison)
        }
        this.apply()
      },
      release: () => {
        this.changes = null
        this.stopFollowingFlow()
        this.highlight.clear()
      },
    })
    const stopFollowingHighlight = this.highlight.subscribe(() => {
      this.apply()
    })
    return () => {
      stopFollowingHighlight()
      stopWatching()
      this.stopFollowingFlow()
      this.changes = null
      this.anchor = null
    }
  }

  private static graphOf(state: ResourceState<ChangeFlow>) {
    return ResourceStates.dataOr(state, null)?.graph ?? null
  }

  private static shows(graph: CallFlowGraph, highlight: SymbolHighlight) {
    return graph.nodes.some((node) => {
      return (
        node.path === highlight.path &&
        node.line === highlight.start &&
        node.endLine === highlight.end
      )
    })
  }

  private followFlow(comparison: Comparison) {
    const flow = this.changeFlows.get(comparison).store
    let graph = SymbolHighlightSync.graphOf(flow.getState())
    this.releaseFlow = flow.subscribe((state) => {
      const next = SymbolHighlightSync.graphOf(state)
      if (next === null || next === graph) {
        return
      }
      graph = next
      const highlight = this.highlight.current()
      if (highlight !== null && !SymbolHighlightSync.shows(next, highlight)) {
        this.highlight.clear()
      }
    })
  }

  private stopFollowingFlow() {
    this.releaseFlow?.()
    this.releaseFlow = null
  }

  private apply() {
    const highlight = this.highlight.current()
    if (this.changes === null || highlight === null) {
      return
    }
    const change = ChangeSets.findEither(this.changes, highlight.path)
    if (change === null) {
      this.highlight.clear()
      return
    }
    if (this.anchor?.highlight !== highlight) {
      this.anchor = { highlight, revision: change.revision }
      return
    }
    if (this.anchor.revision !== change.revision) {
      this.highlight.clear()
    }
  }
}
