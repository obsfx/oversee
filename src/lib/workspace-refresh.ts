import type { AsyncResource } from '@/src/lib/async-resource.ts'
import type { BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import type { FileDiff, FileDiffRequest } from '@/src/lib/file-diff-gateway.ts'
import type { ResourceCache } from '@/src/lib/resource-cache.ts'
import type { WorkspaceChange } from '@/src/lib/server-events.ts'

export class WorkspaceRefresh {
  static readonly everything: WorkspaceChange = { paths: [], refs: true }

  private readonly branches: AsyncResource<BranchList>
  private readonly changeSets: ComparisonCache<ChangeSet>
  private readonly fileDiffs: ResourceCache<FileDiffRequest, FileDiff>

  constructor(
    branches: AsyncResource<BranchList>,
    changeSets: ComparisonCache<ChangeSet>,
    fileDiffs: ResourceCache<FileDiffRequest, FileDiff>,
  ) {
    this.branches = branches
    this.changeSets = changeSets
    this.fileDiffs = fileDiffs
  }

  apply(change: WorkspaceChange) {
    const touched = new Set(change.paths)
    if (change.refs) {
      this.branches.invalidate()
    }
    this.changeSets.invalidateWhere((comparison) => {
      return change.refs || ComparisonRules.isUncommitted(comparison.source)
    })
    this.fileDiffs.invalidateWhere((request) => {
      return change.refs || WorkspaceRefresh.touchesFile(touched, request)
    })
  }

  private static touchesFile(
    touched: ReadonlySet<string>,
    { comparison, change }: FileDiffRequest,
  ) {
    if (!ComparisonRules.isUncommitted(comparison.source)) {
      return false
    }
    if (touched.has(change.path)) {
      return true
    }
    return change.previousPath !== undefined && touched.has(change.previousPath)
  }
}
