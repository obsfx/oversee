import type { AsyncResource } from '@/src/lib/async-resource.ts'
import type { BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ChangeFlows } from '@/src/lib/change-flows.ts'
import type { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import type { Definitions } from '@/src/lib/definitions.ts'
import type { FileContent, FileContentRequest } from '@/src/lib/file-content-gateway.ts'
import type { FileDiff, FileDiffRequest } from '@/src/lib/file-diff-gateway.ts'
import type { ResourceCache } from '@/src/lib/resource-cache.ts'
import type { WorkspaceChange } from '@/src/lib/server-events.ts'

export class WorkspaceRefresh {
  static readonly everything: WorkspaceChange = { paths: [], refs: true }

  private readonly branches: AsyncResource<BranchList>
  private readonly changeSets: ComparisonCache<ChangeSet>
  private readonly changeFlows: ChangeFlows
  private readonly fileDiffs: ResourceCache<FileDiffRequest, FileDiff>
  private readonly fileContents: ResourceCache<FileContentRequest, FileContent>
  private readonly definitions: Definitions

  constructor(
    branches: AsyncResource<BranchList>,
    changeSets: ComparisonCache<ChangeSet>,
    changeFlows: ChangeFlows,
    fileDiffs: ResourceCache<FileDiffRequest, FileDiff>,
    fileContents: ResourceCache<FileContentRequest, FileContent>,
    definitions: Definitions,
  ) {
    this.branches = branches
    this.changeSets = changeSets
    this.changeFlows = changeFlows
    this.fileDiffs = fileDiffs
    this.fileContents = fileContents
    this.definitions = definitions
  }

  apply(change: WorkspaceChange) {
    const touched = new Set(change.paths)
    if (change.refs) {
      this.branches.invalidate()
    }
    const affected = (comparison: Comparison) => {
      return change.refs || ComparisonRules.isUncommitted(comparison.source)
    }
    this.changeSets.invalidateWhere(affected)
    this.changeFlows.invalidateWhere(affected)
    this.fileDiffs.invalidateWhere((request) => {
      return change.refs || WorkspaceRefresh.touchesFile(touched, request)
    })
    this.fileContents.invalidateWhere((request) => {
      return !request.external && (change.refs || touched.has(request.path))
    })
    this.definitions.clear()
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
