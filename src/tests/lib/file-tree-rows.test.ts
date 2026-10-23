import { describe, expect, it } from 'vitest'
import { FileTreeRows } from '@/src/lib/file-tree-rows.ts'

describe('FileTreeRows.revealed', () => {
  it('opens every collapsed folder above the path', () => {
    const collapsed = new Set(['src/', 'src/lib/', 'docs/'])

    expect(FileTreeRows.revealed(collapsed, 'src/lib/flow.ts')).toEqual(new Set(['docs/']))
  })

  it('returns the same set when nothing above the path is collapsed', () => {
    const collapsed = new Set(['docs/'])

    expect(FileTreeRows.revealed(collapsed, 'src/lib/flow.ts')).toBe(collapsed)
  })

  it('keeps a folder whose name only starts like an ancestor', () => {
    const collapsed = new Set(['src/lib-old/'])

    expect(FileTreeRows.revealed(collapsed, 'src/lib/flow.ts')).toBe(collapsed)
  })
})
