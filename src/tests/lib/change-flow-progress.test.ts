import { describe, expect, it } from 'vitest'
import { ChangeFlowProgress } from '@/src/lib/change-flow-progress.ts'
import { type Comparison, ComparisonRules } from '@/src/lib/comparison-rules.ts'
import type { FlowProgress } from '@/src/lib/flow-progress.ts'

const uncommitted: Comparison = { source: ComparisonRules.uncommitted, target: 'main' }
const feature: Comparison = { source: ComparisonRules.branch('feat/flow'), target: 'main' }

const progressOf = (comparison: Comparison, done: number): FlowProgress => {
  return { comparison, servers: [{ server: 'gopls', phase: 'tracing', done, total: 10 }] }
}

const current = (progress: ChangeFlowProgress, comparison: Comparison | null) => {
  return ChangeFlowProgress.of(progress.store.getState(), comparison)
}

describe('ChangeFlowProgress', () => {
  it('starts without progress', () => {
    const progress = new ChangeFlowProgress()

    expect(current(progress, uncommitted)).toBeNull()
    expect(current(progress, null)).toBeNull()
  })

  it('keeps the latest progress per comparison', () => {
    const progress = new ChangeFlowProgress()
    progress.receive(progressOf(uncommitted, 1))
    progress.receive(progressOf(uncommitted, 4))

    expect(current(progress, uncommitted)).toEqual(progressOf(uncommitted, 4))
  })

  it('finds progress by comparison value, not by reference', () => {
    const progress = new ChangeFlowProgress()
    progress.receive(progressOf(uncommitted, 2))

    expect(current(progress, { source: { kind: 'uncommitted' }, target: 'main' })).toEqual(
      progressOf(uncommitted, 2),
    )
  })

  it('keeps another comparison progress without returning it for this one', () => {
    const progress = new ChangeFlowProgress()
    progress.receive(progressOf(feature, 7))

    expect(current(progress, uncommitted)).toBeNull()
    expect(current(progress, feature)).toEqual(progressOf(feature, 7))

    progress.receive(progressOf(uncommitted, 3))
    expect(current(progress, uncommitted)).toEqual(progressOf(uncommitted, 3))
    expect(current(progress, feature)).toEqual(progressOf(feature, 7))
  })

  it('forgets one comparison and leaves the others', () => {
    const progress = new ChangeFlowProgress()
    progress.receive(progressOf(uncommitted, 3))
    progress.receive(progressOf(feature, 7))
    progress.forget(uncommitted)

    expect(current(progress, uncommitted)).toBeNull()
    expect(current(progress, feature)).toEqual(progressOf(feature, 7))
  })

  it('does not notify when forgetting a comparison it never received', () => {
    const progress = new ChangeFlowProgress()
    progress.receive(progressOf(feature, 7))
    const before = progress.store.getState()
    let notified = 0
    progress.store.subscribe(() => {
      notified += 1
    })
    progress.forget(uncommitted)

    expect(progress.store.getState()).toBe(before)
    expect(notified).toBe(0)
  })

  it('clears every comparison', () => {
    const progress = new ChangeFlowProgress()
    progress.receive(progressOf(uncommitted, 3))
    progress.receive(progressOf(feature, 7))
    progress.clear()

    expect(progress.store.getState()).toEqual({})
    expect(current(progress, uncommitted)).toBeNull()
    expect(current(progress, feature)).toBeNull()
  })
})
