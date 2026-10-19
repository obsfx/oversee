import { ResourceStates, type AsyncResource, type ResourceState } from '@/src/lib/async-resource.ts'
import type { BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import {
  ReviewedMarkRules,
  type ReviewedMarks,
  type ReviewScope,
} from '@/src/lib/reviewed-marks.ts'
import type { ReviewedMarksGateway } from '@/src/lib/reviewed-marks-gateway.ts'
import type { WorkspaceInfo } from '@/src/lib/workspace-gateway.ts'

export interface ReviewedMarksStore {
  hydrate(marks: ReviewedMarks): void
  focus(scope: ReviewScope | null): void
  subscribe(listener: (marks: ReviewedMarks) => void): () => void
}

export interface FollowedComparison {
  current(): Comparison | null
  subscribe(listener: () => void): () => void
}

export interface ReviewedMarksSources {
  workspace: AsyncResource<WorkspaceInfo>
  branches: AsyncResource<BranchList>
  changeSets: ComparisonCache<ChangeSet>
  gateway: ReviewedMarksGateway
}

interface FollowedChangeSet {
  key: string
  release: () => void
}

export class ReviewedMarksSync {
  private readonly sources: ReviewedMarksSources
  private readonly marks: ReviewedMarksStore
  private readonly comparison: FollowedComparison
  private persisted: (() => void) | null = null
  private followed: FollowedChangeSet | null = null

  constructor(
    sources: ReviewedMarksSources,
    marks: ReviewedMarksStore,
    comparison: FollowedComparison,
  ) {
    this.sources = sources
    this.marks = marks
    this.comparison = comparison
  }

  start() {
    const { workspace, branches } = this.sources
    void workspace.load()
    this.persist(workspace.store.getState())
    this.follow()
    const unsubscribers = [
      workspace.store.subscribe((state) => {
        this.persist(state)
      }),
      branches.store.subscribe(() => {
        this.follow()
      }),
      this.comparison.subscribe(() => {
        this.follow()
      }),
    ]
    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
      this.persisted?.()
      this.followed?.release()
      this.persisted = null
      this.followed = null
    }
  }

  private persist(state: ResourceState<WorkspaceInfo>) {
    if (state.status !== 'ready' || this.persisted) {
      return
    }
    const { gateway } = this.sources
    const workspace = state.data.path
    this.marks.hydrate(gateway.load(workspace))
    const stopSaving = this.marks.subscribe((marks) => {
      gateway.save(workspace, marks)
    })
    const stopListening = gateway.subscribe(workspace, (marks) => {
      this.marks.hydrate(marks)
    })
    this.persisted = () => {
      stopSaving()
      stopListening()
    }
  }

  private follow() {
    const branchList = ResourceStates.dataOr(this.sources.branches.store.getState(), null)
    const comparison = ComparisonRules.resolve(this.comparison.current(), branchList)
    const key = comparison ? ComparisonRules.key(comparison) : null
    if (key === (this.followed?.key ?? null)) {
      return
    }
    this.followed?.release()
    this.followed = null
    if (!comparison || key === null) {
      this.marks.focus(null)
      return
    }
    const changeSet = this.sources.changeSets.get(comparison)
    const apply = (state: ResourceState<ChangeSet>) => {
      if (state.status === 'ready') {
        this.marks.focus(ReviewedMarkRules.scopeOf(comparison, state.data.changes))
      } else {
        this.marks.focus(null)
      }
    }
    apply(changeSet.store.getState())
    this.followed = { key, release: changeSet.store.subscribe(apply) }
  }
}
