import type { ResourceState } from '@/src/lib/async-resource.ts'
import type { ChangeSet, ChangeStatus, FileChange } from '@/src/lib/change-set.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { ParsedDiffs } from '@/src/lib/parsed-diffs.ts'

export interface DiffPlaceholderContent {
  kind: 'no-changes' | 'no-content'
  title: string
  detail: string
}

export interface DiffPlaceholderInput {
  changeSet: ResourceState<ChangeSet>
  comparison: Comparison | null
  change: FileChange | null
  shown: { path: string; diff: FileDiff } | null
}

export abstract class DiffPlaceholders {
  private static readonly noContentDetails: Record<ChangeStatus, string> = {
    added: 'Empty file added',
    untracked: 'Empty file added',
    deleted: 'Empty file deleted',
    modified: 'Only file metadata changed',
    renamed: 'Renamed without content changes',
  }

  static of({ changeSet, comparison, change, shown }: DiffPlaceholderInput) {
    if (changeSet.status === 'ready' && changeSet.data.changes.length === 0) {
      return DiffPlaceholders.noChanges(comparison)
    }
    if (!change || !shown || shown.path !== change.path || shown.diff.binary) {
      return null
    }
    if (ParsedDiffs.of(shown.path, shown.diff).hunks.length > 0) {
      return null
    }
    return DiffPlaceholders.noContent(change)
  }

  static noChanges(comparison: Comparison | null): DiffPlaceholderContent {
    let detail = 'The working tree matches HEAD'
    if (comparison && !ComparisonRules.isUncommitted(comparison.source)) {
      const source = ComparisonRules.sourceLabel(comparison.source)
      detail = `${source} has no changes against ${comparison.target}`
    }
    return { kind: 'no-changes', title: 'No changes', detail }
  }

  static noContent(change: FileChange): DiffPlaceholderContent {
    let detail = DiffPlaceholders.noContentDetails[change.status]
    if (change.status === 'renamed' && change.previousPath) {
      detail = `Renamed from ${change.previousPath}`
    }
    return { kind: 'no-content', title: 'No content changes', detail }
  }
}
