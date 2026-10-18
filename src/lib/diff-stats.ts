import type { FileChange } from './change-set.ts'

export interface DiffStats {
  files: number
  additions: number
  deletions: number
}

export abstract class DiffStatsRules {
  static of(changes: readonly FileChange[]): DiffStats {
    let additions = 0
    let deletions = 0
    for (const change of changes) {
      additions += change.additions
      deletions += change.deletions
    }
    return { files: changes.length, additions, deletions }
  }
}
