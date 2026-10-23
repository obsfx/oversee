import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { FileDiff, FileDiffRequest } from '@/src/lib/file-diff-gateway.ts'

export interface FlowFixtureFile {
  path: string
  status: 'added' | 'modified'
  additions: number
  deletions: number
  old: string | null
  new: string | null
}

export abstract class FlowFixtureFiles {
  static of(path: string, oldContents: string | null, newContents: string): FlowFixtureFile {
    const oldLines = oldContents === null ? [] : oldContents.split('\n')
    const newLines = newContents.split('\n')
    const remaining = new Map<string, number>()
    for (const line of oldLines) {
      remaining.set(line, (remaining.get(line) ?? 0) + 1)
    }
    let kept = 0
    for (const line of newLines) {
      const count = remaining.get(line) ?? 0
      if (count > 0) {
        remaining.set(line, count - 1)
        kept += 1
      }
    }
    return {
      path,
      status: oldContents === null ? 'added' : 'modified',
      additions: newLines.length - kept,
      deletions: oldLines.length - kept,
      old: oldContents,
      new: newContents,
    }
  }

  static changeSet(files: readonly FlowFixtureFile[]): ChangeSet {
    return {
      changes: files.map((file) => {
        return {
          path: file.path,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          revision: 'fixture',
        }
      }),
    }
  }

  static diff(scope: string, files: readonly FlowFixtureFile[], { change }: FileDiffRequest) {
    const file = files.find((candidate) => {
      return candidate.path === change.path
    })
    const diff: FileDiff = { binary: false, images: null, oldFile: null, newFile: null }
    if (file?.old != null) {
      diff.oldFile = {
        name: file.path,
        contents: file.old,
        cacheKey: `flow::${scope}::old::${file.path}`,
      }
    }
    if (file?.new != null) {
      diff.newFile = {
        name: file.path,
        contents: file.new,
        cacheKey: `flow::${scope}::new::${file.path}`,
      }
    }
    return diff
  }
}
