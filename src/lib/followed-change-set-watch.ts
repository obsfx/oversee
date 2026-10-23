import { ResourceStates, type AsyncResource, type ResourceState } from '@/src/lib/async-resource.ts'
import type { BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { Disposers } from '@/src/lib/disposers.ts'

export interface FollowedComparison {
  current(): Comparison | null
  subscribe(listener: () => void): () => void
}

export interface FollowedChangeSetSources {
  branches: AsyncResource<BranchList>
  changeSets: ComparisonCache<ChangeSet>
}

export interface FollowedChangeSetListener {
  change(comparison: Comparison, state: ResourceState<ChangeSet>): void
  release(): void
}

interface FollowedChangeSet {
  key: string
  release: () => void
}

export class FollowedChangeSetWatch {
  private readonly sources: FollowedChangeSetSources
  private readonly comparison: FollowedComparison
  private followed: FollowedChangeSet | null = null

  constructor(sources: FollowedChangeSetSources, comparison: FollowedComparison) {
    this.sources = sources
    this.comparison = comparison
  }

  start(listener: FollowedChangeSetListener) {
    this.follow(listener)
    return Disposers.all([
      this.sources.branches.store.subscribe(() => {
        this.follow(listener)
      }),
      this.comparison.subscribe(() => {
        this.follow(listener)
      }),
      () => {
        this.followed?.release()
        this.followed = null
      },
    ])
  }

  private follow(listener: FollowedChangeSetListener) {
    const branchList = ResourceStates.dataOr(this.sources.branches.store.getState(), null)
    const comparison = ComparisonRules.resolve(this.comparison.current(), branchList)
    const key = comparison ? ComparisonRules.key(comparison) : null
    if (key === (this.followed?.key ?? null)) {
      return
    }
    if (this.followed !== null) {
      this.followed.release()
      this.followed = null
      listener.release()
    }
    if (!comparison || key === null) {
      return
    }
    const release = this.sources.changeSets.get(comparison).follow((state) => {
      listener.change(comparison, state)
    })
    this.followed = { key, release }
  }
}
