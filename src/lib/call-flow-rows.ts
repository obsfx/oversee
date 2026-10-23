import type { CallFlowEdge, CallFlowGraph, CallFlowNode } from '@/src/lib/call-flow.ts'
import { CallFlowRowKeys } from '@/src/lib/call-flow-row-keys.ts'
import type {
  CallFlowFilter,
  CallFlowGroupRow,
  CallFlowIndex,
  CallFlowLayout,
  CallFlowNodeRow,
  CallFlowOpenWalk,
  CallFlowRow,
  CallFlowTreeOptions,
} from '@/src/lib/call-flow-tree.ts'

interface VisitContext {
  graph: CallFlowGraph
  index: CallFlowIndex
  collapsed: ReadonlySet<string>
  opened: ReadonlySet<string>
  firstKeys: Map<string, string>
  leadsToMatch: ReadonlySet<string> | null
  matches: ReadonlySet<string>
  rows: CallFlowRow[]
}

interface VisitStep {
  node: CallFlowNode
  edge: CallFlowEdge | null
  parent: CallFlowNode | null
  parentKey: string | null
  depth: number
  path: ReadonlySet<string>
  showAll: boolean
  entry: boolean
}

export abstract class CallFlowRows {
  static of(
    graph: CallFlowGraph,
    layout: CallFlowLayout,
    open: CallFlowOpenWalk,
    options: CallFlowTreeOptions,
  ): CallFlowRow[] {
    return CallFlowRows.walk(graph, layout, options, open, new Map(open.firstKeys)).rows
  }

  static walk(
    graph: CallFlowGraph,
    { index, connected, unreached, loose }: CallFlowLayout,
    { collapsed, opened }: CallFlowTreeOptions,
    { matches, leadsToMatch }: CallFlowFilter,
    firstKeys: Map<string, string>,
  ) {
    const context: VisitContext = {
      graph,
      index,
      collapsed,
      opened,
      firstKeys,
      leadsToMatch,
      matches,
      rows: [],
    }
    for (const node of [...connected, ...unreached]) {
      if (context.leadsToMatch !== null && !context.leadsToMatch.has(node.id)) {
        continue
      }
      CallFlowRows.visit(context, {
        node,
        edge: null,
        parent: null,
        parentKey: null,
        depth: 0,
        path: new Set(),
        showAll: context.leadsToMatch === null,
        entry: true,
      })
    }
    CallFlowRows.visitLoose(context, loose)
    return { rows: context.rows, firstKeys: context.firstKeys }
  }

  static isRepeat(row: CallFlowRow) {
    return row.type === 'node' && row.repeat
  }

  private static visit(context: VisitContext, step: VisitStep) {
    const { node, parentKey } = step
    const key = CallFlowRowKeys.child(parentKey, node.id)
    const cycle = step.path.has(node.id)
    const origins = step.entry ? (context.graph.origins[node.id] ?? []) : []
    const children = cycle ? [] : CallFlowRows.childrenOf(context, step)
    const expandable =
      !cycle && (origins.length > 0 || CallFlowRows.calls(context, node).length > 0)
    const firstKey = context.firstKeys.get(node.id)
    const repeat = expandable && firstKey !== undefined && firstKey !== key
    const row: CallFlowNodeRow = {
      type: 'node',
      key,
      parentKey,
      depth: step.depth,
      node,
      edge: step.edge,
      parent: step.parent,
      expandable,
      expanded: false,
      cycle,
      repeat,
    }
    context.rows.push(row)
    if (cycle || !CallFlowRows.isOpen(context, key, repeat)) {
      return
    }
    if (firstKey === undefined) {
      context.firstKeys.set(node.id, key)
    }
    const showOrigins = origins.length > 0 && (step.showAll || context.matches.has(node.id))
    if (showOrigins) {
      context.rows.push({
        type: 'origin',
        key: CallFlowRowKeys.origin(key),
        parentKey: key,
        depth: step.depth + 1,
        origins,
        expandable: false,
        expanded: false,
      })
    }
    row.expanded = showOrigins || children.length > 0
    const path = new Set(step.path).add(node.id)
    const showAll = step.showAll || context.matches.has(node.id)
    for (const edge of children) {
      const target = context.index.byId.get(edge.to)
      if (target === undefined) {
        continue
      }
      CallFlowRows.visit(context, {
        node: target,
        edge,
        parent: node,
        parentKey: key,
        depth: step.depth + 1,
        path,
        showAll,
        entry: false,
      })
    }
  }

  private static visitLoose(context: VisitContext, loose: readonly CallFlowNode[]) {
    const shown = loose.filter((node) => {
      return context.leadsToMatch === null || context.matches.has(node.id)
    })
    if (shown.length === 0) {
      return
    }
    const group: CallFlowGroupRow = {
      type: 'group',
      key: CallFlowRowKeys.notConnected,
      parentKey: null,
      depth: 0,
      count: shown.length,
      expandable: true,
      expanded:
        context.leadsToMatch !== null || !context.collapsed.has(CallFlowRowKeys.notConnected),
    }
    context.rows.push(group)
    if (!group.expanded) {
      return
    }
    for (const node of shown) {
      CallFlowRows.visit(context, {
        node,
        edge: null,
        parent: null,
        parentKey: CallFlowRowKeys.notConnected,
        depth: 1,
        path: new Set(),
        showAll: true,
        entry: true,
      })
    }
  }

  private static isOpen(context: VisitContext, key: string, repeat: boolean) {
    if (context.leadsToMatch !== null) {
      return !repeat
    }
    if (repeat) {
      return context.opened.has(key)
    }
    return !context.collapsed.has(key)
  }

  private static childrenOf(context: VisitContext, step: VisitStep) {
    const calls = CallFlowRows.calls(context, step.node)
    if (step.showAll || context.leadsToMatch === null || context.matches.has(step.node.id)) {
      return calls
    }
    const leadsToMatch = context.leadsToMatch
    return calls.filter((edge) => {
      return leadsToMatch.has(edge.to)
    })
  }

  private static calls(context: VisitContext, node: CallFlowNode) {
    return context.index.outgoing.get(node.id) ?? []
  }
}
