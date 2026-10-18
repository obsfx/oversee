import { parseDiffFromFile } from '@pierre/diffs'
import type { FileDiffMetadata } from '@pierre/diffs/react'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'

export abstract class ParsedDiffs {
  private static readonly parsed = new WeakMap<FileDiff, FileDiffMetadata>()

  static of(path: string, diff: FileDiff) {
    const existing = ParsedDiffs.parsed.get(diff)
    if (existing) {
      return existing
    }
    const metadata = parseDiffFromFile(
      diff.oldFile ?? DiffSurface.emptyFile(path, 'old'),
      diff.newFile ?? DiffSurface.emptyFile(path, 'new'),
    )
    ParsedDiffs.parsed.set(diff, metadata)
    return metadata
  }
}
