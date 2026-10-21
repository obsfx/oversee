import { ChangeSets, ChangeStatuses, type FileChange, type FileSide } from '@/src/lib/change-set.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'

export type CommentLocationTarget =
  | { kind: 'review'; path: string; side: FileSide; line: number }
  | { kind: 'file'; path: string; line: number }

export abstract class CommentLocations {
  static targetOf(
    { filePath, range }: Pick<ReviewComment, 'filePath' | 'range'>,
    changes: readonly FileChange[],
  ): CommentLocationTarget {
    const change =
      ChangeSets.find(changes, filePath) ??
      changes.find((candidate) => {
        return candidate.previousPath === filePath
      })
    if (!change) {
      return { kind: 'file', path: filePath, line: range.start }
    }
    let side: FileSide = 'new'
    if (range.side === 'deletions' || !ChangeStatuses.hasNewSide(change.status)) {
      side = 'old'
    }
    if (!ChangeStatuses.hasOldSide(change.status)) {
      side = 'new'
    }
    return { kind: 'review', path: change.path, side, line: range.start }
  }
}
