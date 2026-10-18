import type { FileChange } from './change-set.ts'

export interface DiffStats {
  files: number
  additions: number
  deletions: number
}

export interface DiffStatBlocks {
  added: number
  deleted: number
  neutral: number
}

export abstract class DiffStatsRules {
  static blocks(additions: number, deletions: number, count: number): DiffStatBlocks {
    const changed = additions + deletions
    if (changed === 0) {
      return { added: 0, deleted: 0, neutral: count }
    }
    const added = Math.round((additions / changed) * count)
    return { added, deleted: count - added, neutral: 0 }
  }

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
