import { describe, expect, it } from 'vitest'
import type { FileChange } from '@/src/lib/change-set.ts'
import { FileTreeLabels } from '@/src/lib/file-tree-labels.ts'

const change = (values: Pick<FileChange, 'path' | 'status'> & Partial<FileChange>): FileChange => {
  return { additions: 1, deletions: 0, revision: 'abc123', ...values }
}

describe('FileTreeLabels.fileTitle', () => {
  it('ends with the lowercase status', () => {
    expect(FileTreeLabels.fileTitle(change({ path: 'src/a.ts', status: 'added' }))).toBe(
      'src/a.ts, added',
    )
    expect(FileTreeLabels.fileTitle(change({ path: 'src/a.ts', status: 'modified' }))).toBe(
      'src/a.ts, modified',
    )
    expect(FileTreeLabels.fileTitle(change({ path: 'ci/staging.yml', status: 'deleted' }))).toBe(
      'ci/staging.yml, deleted',
    )
    expect(FileTreeLabels.fileTitle(change({ path: 'game/dash.gd', status: 'untracked' }))).toBe(
      'game/dash.gd, untracked',
    )
  })

  it('keeps the previous path of a renamed file', () => {
    const renamed = change({
      path: 'internal/service/workspace_watcher.go',
      status: 'renamed',
      previousPath: 'internal/service/watcher.go',
    })

    expect(FileTreeLabels.fileTitle(renamed)).toBe(
      'internal/service/workspace_watcher.go, renamed from internal/service/watcher.go',
    )
  })
})

describe('FileTreeLabels.rowLabel', () => {
  it('names the file, its status and its line counts', () => {
    const deleted = change({
      path: 'ci/staging.yml',
      status: 'deleted',
      additions: 0,
      deletions: 42,
    })

    expect(FileTreeLabels.rowLabel('staging.yml', deleted)).toBe(
      'staging.yml, Deleted, 0 lines added, 42 removed',
    )
  })

  it('uses the singular for one added line', () => {
    const added = change({ path: 'src/a.ts', status: 'added', additions: 1, deletions: 0 })

    expect(FileTreeLabels.rowLabel('a.ts', added)).toBe('a.ts, Added, 1 line added, 0 removed')
  })
})
