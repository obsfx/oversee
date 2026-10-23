import { describe, expect, it } from 'vitest'
import type { CallFlowEdge, CallFlowGraph, CallFlowNode } from '@/src/lib/call-flow.ts'
import { CallFlowLayouts } from '@/src/lib/call-flow-layouts.ts'
import { CallFlowOpenWalks } from '@/src/lib/call-flow-open-walks.ts'
import { CallFlowRows } from '@/src/lib/call-flow-rows.ts'
import type { CallFlowNodeRow, CallFlowTreeOptions } from '@/src/lib/call-flow-tree.ts'

abstract class Graphs {
  static node(id: string, name: string, line: number): CallFlowNode {
    return {
      id,
      name,
      kind: 'function',
      path: `src/${id}.ts`,
      line,
      endLine: line + 4,
      change: 'modified',
    }
  }

  static call(from: string, to: string, line: number): CallFlowEdge {
    return { from, to, line, via: 'call', label: null }
  }

  static readonly hub: CallFlowGraph = {
    nodes: [
      Graphs.node('main', 'runMain', 1),
      Graphs.node('config', 'loadConfig', 1),
      Graphs.node('parse', 'parseTarget', 1),
      Graphs.node('log', 'logLine', 1),
      Graphs.node('format', 'formatLine', 1),
    ],
    edges: [
      Graphs.call('main', 'config', 2),
      Graphs.call('main', 'log', 3),
      Graphs.call('config', 'parse', 2),
      Graphs.call('config', 'log', 3),
      Graphs.call('log', 'format', 2),
    ],
    origins: {},
  }

  static rows(query: string, options: CallFlowTreeOptions) {
    const layout = CallFlowLayouts.of(Graphs.hub)
    const walk = CallFlowOpenWalks.of(Graphs.hub, layout, query)
    return CallFlowRows.of(Graphs.hub, layout, walk, options).filter((row) => {
      return row.type === 'node'
    })
  }

  static names(rows: readonly CallFlowNodeRow[]) {
    return rows.map((row) => {
      return row.node.name
    })
  }

  static collapseAll() {
    const layout = CallFlowLayouts.of(Graphs.hub)
    return new Set(CallFlowOpenWalks.of(Graphs.hub, layout, '').expandableKeys)
  }
}

const NONE: ReadonlySet<string> = new Set()

describe('CallFlowRows filtering', () => {
  it('shows a match under rows the user collapsed', () => {
    const collapsed = Graphs.collapseAll()

    expect(Graphs.names(Graphs.rows('', { collapsed, opened: NONE }))).toEqual(['runMain'])
    expect(Graphs.names(Graphs.rows('parseTarget', { collapsed, opened: NONE }))).toEqual([
      'runMain',
      'loadConfig',
      'parseTarget',
    ])
  })

  it('keeps repeated subtrees closed while filtering', () => {
    const rows = Graphs.rows('formatLine', { collapsed: NONE, opened: NONE })

    const formats = rows.filter((row) => {
      return row.node.name === 'formatLine'
    })
    const repeats = rows.filter((row) => {
      return row.repeat
    })
    expect(formats).toHaveLength(1)
    expect(
      repeats.map((row) => {
        return row.node.name
      }),
    ).toEqual(['logLine'])
    expect(repeats[0]?.expanded).toBe(false)
  })

  it('ignores opened repeats while filtering', () => {
    const repeat = Graphs.rows('', { collapsed: NONE, opened: NONE }).find((row) => {
      return row.repeat
    })
    expect(repeat).toBeDefined()

    const rows = Graphs.rows('formatLine', {
      collapsed: NONE,
      opened: new Set([repeat?.key ?? '']),
    })

    expect(
      rows.filter((row) => {
        return row.node.name === 'formatLine'
      }),
    ).toHaveLength(1)
  })

  it('restores the collapsed view when the filter is cleared', () => {
    const collapsed = Graphs.collapseAll()
    const before = Graphs.rows('', { collapsed, opened: NONE })

    Graphs.rows('parseTarget', { collapsed, opened: NONE })

    expect(Graphs.rows('', { collapsed, opened: NONE })).toEqual(before)
  })
})
