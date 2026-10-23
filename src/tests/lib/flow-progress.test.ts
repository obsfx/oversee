import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { type FlowServerProgress, FlowProgressRules } from '@/src/lib/flow-progress.ts'

const progress = (
  server: string,
  phase: FlowServerProgress['phase'],
  done = 0,
  total = 0,
): FlowServerProgress => {
  return { server, phase, done, total }
}

describe('FlowProgressRules.ratio', () => {
  it('has no ratio without servers', () => {
    expect(FlowProgressRules.ratio([])).toBeNull()
  })

  it('counts a starting server as nothing done and a finished one as complete', () => {
    expect(FlowProgressRules.ratio([progress('gopls', 'starting')])).toBe(0)
    expect(FlowProgressRules.ratio([progress('gopls', 'done', 412, 412)])).toBe(1)
  })

  it('moves from 0 to 0.3 while reading files', () => {
    expect(FlowProgressRules.ratio([progress('gopls', 'reading', 0, 40)])).toBe(0)
    expect(FlowProgressRules.ratio([progress('gopls', 'reading', 20, 40)])).toBeCloseTo(0.15)
    expect(FlowProgressRules.ratio([progress('gopls', 'reading', 40, 40)])).toBeCloseTo(0.3)
  })

  it('moves from 0.3 to 1 while tracing functions', () => {
    expect(FlowProgressRules.ratio([progress('gopls', 'tracing', 0, 100)])).toBeCloseTo(0.3)
    expect(FlowProgressRules.ratio([progress('gopls', 'tracing', 50, 100)])).toBeCloseTo(0.65)
    expect(FlowProgressRules.ratio([progress('gopls', 'tracing', 100, 100)])).toBeCloseTo(1)
  })

  it('treats an empty phase as not started and caps counts above the total', () => {
    expect(FlowProgressRules.ratio([progress('gopls', 'reading', 0, 0)])).toBe(0)
    expect(FlowProgressRules.ratio([progress('gopls', 'tracing', 0, 0)])).toBeCloseTo(0.3)
    expect(FlowProgressRules.ratio([progress('gopls', 'reading', 90, 40)])).toBeCloseTo(0.3)
  })

  it('weighs every server the same, whatever its size', () => {
    const ratio = FlowProgressRules.ratio([
      progress('typescript-language-server', 'done', 1069, 1069),
      progress('gopls', 'starting'),
    ])
    expect(ratio).toBeCloseTo(0.5)

    const mixed = FlowProgressRules.ratio([
      progress('typescript-language-server', 'reading', 56, 112),
      progress('gopls', 'tracing', 206, 412),
    ])
    expect(mixed).toBeCloseTo((0.15 + 0.65) / 2)
  })
})

describe('FlowProgressRules.lagging', () => {
  it('has no lag without servers or when every server is done', () => {
    expect(FlowProgressRules.lagging([])).toBeNull()
    expect(FlowProgressRules.lagging([progress('gopls', 'done', 4, 4)])).toBeNull()
  })

  it('picks the servers in the least advanced phase', () => {
    const typescript = progress('typescript-language-server', 'reading', 40, 112)
    const pyright = progress('pyright', 'reading', 5, 20)
    const lag = FlowProgressRules.lagging([
      progress('gopls', 'tracing', 100, 412),
      typescript,
      progress('rust-analyzer', 'done', 9, 9),
      pyright,
    ])

    expect(lag).toEqual({ phase: 'reading', servers: [typescript, pyright], done: 45, total: 132 })
  })

  it('restarts the lag when a later server is behind the earlier ones', () => {
    const gopls = progress('gopls', 'starting')
    const lag = FlowProgressRules.lagging([
      progress('typescript-language-server', 'tracing', 400, 1069),
      progress('pyright', 'reading', 3, 20),
      gopls,
    ])

    expect(lag).toEqual({ phase: 'starting', servers: [gopls], done: 0, total: 0 })
  })

  it('caps each server at its total when summing', () => {
    const lag = FlowProgressRules.lagging([
      progress('gopls', 'tracing', 50, 40),
      progress('pyright', 'tracing', 10, 20),
    ])

    expect(lag?.done).toBe(50)
    expect(lag?.total).toBe(60)
  })
})

describe('FlowProgressRules.readyCount', () => {
  it('counts the finished servers', () => {
    expect(FlowProgressRules.readyCount([])).toBe(0)
    expect(
      FlowProgressRules.readyCount([
        progress('gopls', 'done', 4, 4),
        progress('pyright', 'tracing', 1, 4),
        progress('typescript-language-server', 'done', 9, 9),
      ]),
    ).toBe(2)
  })
})

describe('FlowProgressRules.server', () => {
  it('accepts every phase with non negative counts', () => {
    for (const phase of ['starting', 'reading', 'tracing', 'done']) {
      const result = v.safeParse(FlowProgressRules.server, {
        server: 'gopls',
        phase,
        done: 0,
        total: 3,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects an unknown phase, negative or fractional counts and a missing server', () => {
    const invalid = [
      { server: 'gopls', phase: 'linking', done: 0, total: 3 },
      { server: 'gopls', phase: 'reading', done: -1, total: 3 },
      { server: 'gopls', phase: 'reading', done: 1.5, total: 3 },
      { server: 'gopls', phase: 'reading', done: 0, total: -3 },
      { phase: 'reading', done: 0, total: 3 },
    ]
    for (const value of invalid) {
      expect(v.safeParse(FlowProgressRules.server, value).success).toBe(false)
    }
  })
})
