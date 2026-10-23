import type { CallFlowEdge, CallFlowGraph, CallFlowNode } from '@/src/lib/call-flow.ts'
import { CallFlowGraphSearch } from '@/src/lib/call-flow-graph-search.ts'
import type { CallFlowIndex, CallFlowLayout } from '@/src/lib/call-flow-tree.ts'

export abstract class CallFlowLayouts {
  static of(graph: CallFlowGraph): CallFlowLayout {
    const index = CallFlowLayouts.index(graph)
    return { index, ...CallFlowLayouts.entryPoints(graph, index) }
  }

  private static index(graph: CallFlowGraph): CallFlowIndex {
    const byId = new Map(
      graph.nodes.map((node) => {
        return [node.id, node]
      }),
    )
    const outgoing = new Map<string, CallFlowEdge[]>()
    const incoming = new Map<string, CallFlowEdge[]>()
    for (const edge of graph.edges) {
      if (edge.from === edge.to || !byId.has(edge.from) || !byId.has(edge.to)) {
        continue
      }
      const calls = outgoing.get(edge.from) ?? []
      const duplicate = calls.some((existing) => {
        return existing.to === edge.to
      })
      if (duplicate) {
        continue
      }
      calls.push(edge)
      outgoing.set(edge.from, calls)
      const callers = incoming.get(edge.to) ?? []
      callers.push(edge)
      incoming.set(edge.to, callers)
    }
    for (const calls of outgoing.values()) {
      calls.sort((left, right) => {
        return left.line - right.line
      })
    }
    return { byId, outgoing, incoming }
  }

  private static entryPoints(graph: CallFlowGraph, index: CallFlowIndex) {
    const roots = graph.nodes
      .filter((node) => {
        return (index.incoming.get(node.id) ?? []).length === 0
      })
      .sort(CallFlowLayouts.byLocation)
    const connected = roots.filter((node) => {
      return (index.outgoing.get(node.id) ?? []).length > 0
    })
    const loose = roots.filter((node) => {
      return (index.outgoing.get(node.id) ?? []).length === 0
    })
    const looseIds = new Set(
      loose.map((node) => {
        return node.id
      }),
    )
    const reachable = CallFlowGraphSearch.closure(
      connected.map((node) => {
        return node.id
      }),
      (id) => {
        return (index.outgoing.get(id) ?? []).map((edge) => {
          return edge.to
        })
      },
    )
    const remaining = graph.nodes
      .filter((node) => {
        return !reachable.has(node.id) && !looseIds.has(node.id)
      })
      .sort(CallFlowLayouts.byLocation)
    const unreached = CallFlowLayouts.cycleEntries(index, remaining)
    return { connected, unreached, loose }
  }

  private static cycleEntries(index: CallFlowIndex, remaining: readonly CallFlowNode[]) {
    const componentOf = CallFlowGraphSearch.components(index, remaining)
    const called = new Set<string>()
    for (const node of remaining) {
      const component = componentOf.get(node.id)
      for (const edge of index.incoming.get(node.id) ?? []) {
        const caller = componentOf.get(edge.from)
        if (component !== undefined && caller !== undefined && caller !== component) {
          called.add(component)
        }
      }
    }
    const entries: CallFlowNode[] = []
    const taken = new Set<string>()
    for (const node of remaining) {
      const component = componentOf.get(node.id)
      if (component === undefined || called.has(component) || taken.has(component)) {
        continue
      }
      taken.add(component)
      entries.push(node)
    }
    return entries
  }

  private static byLocation(left: CallFlowNode, right: CallFlowNode) {
    return left.path.localeCompare(right.path) || left.line - right.line
  }
}
