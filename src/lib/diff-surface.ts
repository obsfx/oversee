import type { FileContents, VirtualFileMetrics } from '@pierre/diffs/react'
import type { CSSProperties } from 'react'
import type { FileSide } from '@/src/lib/change-set.ts'

const VIRTUAL_METRICS: VirtualFileMetrics = {
  hunkLineCount: 50,
  lineHeight: 20,
  diffHeaderHeight: 44,
  spacing: 8,
  paddingTop: 0,
}

const SELECTED_ROWS = ':is([data-line],[data-line-annotation])[data-selected-line]'
const SELECTED_NUMBERS = '[data-column-number][data-selected-line]'
const ANNOTATION_ROWS = '[data-line-annotation],[data-gutter-buffer=annotation]'
const HOVERED_ROWS =
  ':is([data-line],[data-column-number],[data-gutter-buffer],[data-no-newline])[data-hovered]'
const HOVER_TINT =
  '--diffs-computed-hovered-line-bg:light-dark(' +
  'color-mix(in lab, var(--diffs-computed-editor-active-line-bg) 95%, var(--color-accent)),' +
  'color-mix(in lab, var(--diffs-computed-editor-active-line-bg) 90%, var(--color-accent)))'
const CODE_BLOCKS = '[data-code],[data-diff-type=split][data-overflow=scroll]'
const DELETION_BARS =
  '[data-indicators=bars] [data-line-type=change-deletion][data-column-number]::before'

export abstract class DiffSurface {
  static readonly style = {
    '--diffs-bg-selection-override': 'var(--color-accent)',
    '--diffs-bg-selection-number-override': 'var(--color-accent)',
    '--diffs-font-family': 'var(--font-editor)',
    '--diffs-font-size': 'var(--editor-font-size)',
    '--diffs-line-height': 'calc(var(--editor-font-size) * var(--editor-line-height))',
  } as CSSProperties

  static readonly css =
    `${SELECTED_ROWS}{--mix-selection-light:91%;--mix-selection-dark:87%}` +
    `${SELECTED_NUMBERS}{--mix-selection-light:84%;--mix-selection-dark:74%}` +
    `${CODE_BLOCKS}{padding-top:0}` +
    `${DELETION_BARS}{background-image:none;background-color:var(--diffs-deletion-base)}` +
    `${ANNOTATION_ROWS}{--diffs-annotation-bg:var(--diffs-bg)}` +
    `@media (pointer:fine){${HOVERED_ROWS}{${HOVER_TINT}}}`

  static metrics(fontSize: number, lineHeight: number): VirtualFileMetrics {
    return { ...VIRTUAL_METRICS, lineHeight: fontSize * lineHeight }
  }

  static emptyFile(path: string, side: FileSide): FileContents {
    return { name: path, contents: '', cacheKey: `empty::${side}::${path}` }
  }

  static commentElementId(commentId: string) {
    return `comment-${commentId}`
  }
}
