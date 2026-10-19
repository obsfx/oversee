import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import type { LineRange } from '@/src/lib/line-range.ts'

export abstract class CommentSnapshots {
  static expectedLines(diff: FileDiff, range: LineRange) {
    const file = range.endSide === 'deletions' ? diff.oldFile : diff.newFile
    if (!file) {
      return []
    }
    const lines = file.contents.split('\n')
    const start = Math.min(Math.max(range.start, 1), lines.length + 1)
    const end = Math.min(range.end, lines.length)
    return lines.slice(start - 1, end)
  }
}
