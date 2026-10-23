import { describe, expect, it } from 'vitest'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import type { FlowServerProgress } from '@/src/lib/flow-progress.ts'
import { FlowProgressLabels } from '@/src/lib/flow-progress-labels.ts'
import { languageServerList } from '@/src/stories/support/language-server-fixture.ts'

const progress = (
  server: string,
  phase: FlowServerProgress['phase'],
  done = 0,
  total = 0,
): FlowServerProgress => {
  return { server, phase, done, total }
}

const phase = (servers: FlowServerProgress[]) => {
  return FlowProgressLabels.phase(servers, languageServerList)
}

describe('FlowProgressLabels.phase', () => {
  it('reads the changes before any server reports', () => {
    expect(phase([])).toBe('Reading the changes')
  })

  it('names a starting server by its id', () => {
    expect(phase([progress('gopls', 'starting')])).toBe('Starting gopls')
  })

  it('names a reading or tracing server by its first language', () => {
    expect(phase([progress('typescript-language-server', 'reading', 40, 112)])).toBe(
      'Reading symbols in TypeScript, 40 of 112 files',
    )
    expect(phase([progress('typescript-language-server', 'tracing', 412, 1069)])).toBe(
      'Tracing calls in TypeScript, 412 of 1069 functions',
    )
  })

  it('joins the servers of the lagging phase and sums their counts', () => {
    expect(
      phase([
        progress('typescript-language-server', 'tracing', 412, 1069),
        progress('gopls', 'tracing', 100, 412),
        progress('pyright', 'done', 96, 96),
      ]),
    ).toBe('Tracing calls in TypeScript and Go, 512 of 1481 functions, 1 of 3 servers ready')
    expect(
      phase([
        progress('pyright', 'starting'),
        progress('gopls', 'starting'),
        progress('typescript-language-server', 'reading', 3, 112),
      ]),
    ).toBe('Starting pyright and gopls, 0 of 3 servers ready')
  })

  it('says how many servers are ready only when there are several', () => {
    expect(phase([progress('gopls', 'reading', 1, 4)])).not.toContain('ready')
    expect(phase([progress('gopls', 'reading', 1, 4), progress('pyright', 'done', 2, 2)])).toBe(
      'Reading symbols in Go, 1 of 4 files, 1 of 2 servers ready',
    )
  })

  it('builds the call tree once every server is done', () => {
    expect(phase([progress('gopls', 'done', 4, 4)])).toBe('Building the call tree')
    expect(phase([progress('gopls', 'done', 4, 4), progress('pyright', 'done', 2, 2)])).toBe(
      'Building the call tree',
    )
  })

  it('falls back to the server id without a language server list or an unknown server', () => {
    expect(FlowProgressLabels.phase([progress('gopls', 'reading', 1, 4)], null)).toBe(
      'Reading symbols in gopls, 1 of 4 files',
    )
    expect(phase([progress('gdscript', 'tracing', 2, 9)])).toBe(
      'Tracing calls in gdscript, 2 of 9 functions',
    )
  })

  it('names a language once when two servers share it', () => {
    const list = {
      ...languageServerList,
      servers: languageServerList.servers.map((server) => {
        return server.id === 'pyright' ? { ...server, languages: ['Go'] } : server
      }),
    }
    const label = FlowProgressLabels.phase(
      [progress('gopls', 'reading', 1, 4), progress('pyright', 'reading', 2, 6)],
      list,
    )

    expect(label).toBe('Reading symbols in Go, 3 of 10 files, 0 of 2 servers ready')
  })

  it('uses the singular for one file or one function', () => {
    expect(phase([progress('gopls', 'reading', 0, 1)])).toBe('Reading symbols in Go, 0 of 1 file')
    expect(phase([progress('gopls', 'tracing', 1, 1)])).toBe('Tracing calls in Go, 1 of 1 function')
    expect(phase([progress('gopls', 'tracing', 0, 0)])).toBe(
      'Tracing calls in Go, 0 of 0 functions',
    )
  })
})

describe('FlowProgressLabels.line', () => {
  const comparison = { source: ComparisonRules.uncommitted, target: 'main' }

  it('shows the loading text while the flow request runs without progress', () => {
    expect(FlowProgressLabels.line(null, languageServerList, false)).toEqual({
      ratio: null,
      phase: CallFlowLabels.loading,
    })
  })

  it('waits for language servers when the flow loaded without progress', () => {
    expect(FlowProgressLabels.line(null, languageServerList, true)).toEqual({
      ratio: null,
      phase: CallFlowLabels.waiting,
    })
  })

  it('carries the ratio and the phase of the progress', () => {
    const line = FlowProgressLabels.line(
      { comparison, servers: [progress('gopls', 'tracing', 50, 100)] },
      languageServerList,
      false,
    )

    expect(line.phase).toBe('Tracing calls in Go, 50 of 100 functions')
    expect(line.ratio).toBeCloseTo(0.65)
  })

  it('has no ratio while the changes are read', () => {
    expect(FlowProgressLabels.line({ comparison, servers: [] }, null, false)).toEqual({
      ratio: null,
      phase: 'Reading the changes',
    })
  })
})
