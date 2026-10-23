import { createStore, type StoreApi } from 'zustand/vanilla'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import type { FlowProgress } from '@/src/lib/flow-progress.ts'

export type FlowProgressEntries = Readonly<Record<string, FlowProgress>>

const NONE: FlowProgressEntries = {}

export class ChangeFlowProgress {
  readonly store: StoreApi<FlowProgressEntries> = createStore<FlowProgressEntries>()(() => {
    return NONE
  })

  static of(entries: FlowProgressEntries, comparison: Comparison | null) {
    if (comparison === null) {
      return null
    }
    return entries[ComparisonRules.key(comparison)] ?? null
  }

  receive(progress: FlowProgress) {
    const key = ComparisonRules.key(progress.comparison)
    this.store.setState({ ...this.store.getState(), [key]: progress }, true)
  }

  forget(comparison: Comparison) {
    const key = ComparisonRules.key(comparison)
    const entries = this.store.getState()
    if (!(key in entries)) {
      return
    }
    const rest: Record<string, FlowProgress> = { ...entries }
    delete rest[key]
    this.store.setState(rest, true)
  }

  clear() {
    this.store.setState(NONE, true)
  }
}
