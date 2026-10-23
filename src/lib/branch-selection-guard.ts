import type { AsyncResource, ResourceState } from '@/src/lib/async-resource.ts'
import type { BranchList } from '@/src/lib/branch-gateway.ts'
import {
  ComparisonRules,
  type Comparison,
  type ComparisonReplacement,
} from '@/src/lib/comparison-rules.ts'
import { Disposers } from '@/src/lib/disposers.ts'

export interface ComparisonSelection {
  current(): Comparison | null
  replace(replacement: ComparisonReplacement): void
}

export class BranchSelectionGuard {
  private readonly branches: AsyncResource<BranchList>
  private readonly selection: ComparisonSelection

  constructor(branches: AsyncResource<BranchList>, selection: ComparisonSelection) {
    this.branches = branches
    this.selection = selection
  }

  start() {
    void this.branches.load()
    const release = this.branches.watch()
    return Disposers.all([
      this.branches.follow((state) => {
        this.check(state)
      }),
      release,
    ])
  }

  private check(state: ResourceState<BranchList>) {
    const selected = this.selection.current()
    if (state.status !== 'ready' || !selected) {
      return
    }
    const replacement = ComparisonRules.replaceMissing(selected, state.data)
    if (replacement) {
      this.selection.replace(replacement)
    }
  }
}
