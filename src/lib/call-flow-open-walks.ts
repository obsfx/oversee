import type { CallFlowGraph } from '@/src/lib/call-flow.ts'
import { CallFlowGraphSearch } from '@/src/lib/call-flow-graph-search.ts'
import { CallFlowRows } from '@/src/lib/call-flow-rows.ts'
import type { CallFlowLayout, CallFlowOpenWalk } from '@/src/lib/call-flow-tree.ts'
import { TextQueries } from '@/src/lib/text-queries.ts'

const NOTHING: ReadonlySet<string> = new Set()

export abstract class CallFlowOpenWalks {
  static of(graph: CallFlowGraph, layout: CallFlowLayout, query: string): CallFlowOpenWalk {
    const matches = CallFlowOpenWalks.matches(graph, query)
    let leadsToMatch: ReadonlySet<string> | null = null
    if (TextQueries.isActive(query)) {
      leadsToMatch = CallFlowGraphSearch.closure(matches, (id) => {
        return (layout.index.incoming.get(id) ?? []).map((edge) => {
          return edge.from
        })
      })
    }
    const filter = { matches, leadsToMatch }
    const walk = CallFlowRows.walk(
      graph,
      layout,
      { collapsed: NOTHING, opened: NOTHING },
      filter,
      new Map(),
    )
    const expandableKeys = walk.rows
      .filter((row) => {
        return row.expandable && !CallFlowRows.isRepeat(row)
      })
      .map((row) => {
        return row.key
      })
    return { ...filter, firstKeys: walk.firstKeys, expandableKeys }
  }

  private static matches(graph: CallFlowGraph, query: string) {
    if (!TextQueries.isActive(query)) {
      return new Set<string>()
    }
    return new Set(
      graph.nodes
        .filter((node) => {
          return TextQueries.matches(`${node.name} ${node.path}`, query)
        })
        .map((node) => {
          return node.id
        }),
    )
  }
}
