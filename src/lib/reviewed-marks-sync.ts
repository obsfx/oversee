import type { AsyncResource, ResourceState } from '@/src/lib/async-resource.ts'
import { Disposers } from '@/src/lib/disposers.ts'
import {
  FollowedChangeSetWatch,
  type FollowedChangeSetSources,
  type FollowedComparison,
} from '@/src/lib/followed-change-set-watch.ts'
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

export interface ReviewedMarksSources extends FollowedChangeSetSources {
  workspace: AsyncResource<WorkspaceInfo>
  gateway: ReviewedMarksGateway
}

export class ReviewedMarksSync {
  private readonly sources: ReviewedMarksSources
  private readonly marks: ReviewedMarksStore
  private readonly watch: FollowedChangeSetWatch
  private persisted: (() => void) | null = null

  constructor(
    sources: ReviewedMarksSources,
    marks: ReviewedMarksStore,
    comparison: FollowedComparison,
  ) {
    this.sources = sources
    this.marks = marks
    this.watch = new FollowedChangeSetWatch(sources, comparison)
  }

  start() {
    const { workspace } = this.sources
    void workspace.load()
    const stopPersisting = workspace.follow((state) => {
      this.persist(state)
    })
    const stopWatching = this.watch.start({
      change: (comparison, state) => {
        if (state.status === 'ready') {
          this.marks.focus(ReviewedMarkRules.scopeOf(comparison, state.data.changes))
        } else {
          this.marks.focus(null)
        }
      },
      release: () => {
        this.marks.focus(null)
      },
    })
    return Disposers.all([
      stopPersisting,
      stopWatching,
      () => {
        this.persisted?.()
        this.persisted = null
      },
    ])
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
    this.persisted = Disposers.all([stopSaving, stopListening])
  }
}
