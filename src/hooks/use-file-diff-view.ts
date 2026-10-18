import { useVirtualizer } from '@pierre/diffs/react'
import { useRef } from 'react'
import type { RenderedDiff } from '@/src/lib/diff-line-reveal.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'
import { useCommentFocus } from '@/src/hooks/use-comment-focus.ts'
import { useDiffAnnotations } from '@/src/hooks/use-diff-annotations.ts'
import { useDiffOptions } from '@/src/hooks/use-diff-options.ts'
import { useSelectionEscape } from '@/src/hooks/use-selection-escape.ts'

export const useFileDiffView = (path: string, diff: FileDiff) => {
  const rendered = useRef<RenderedDiff | null>(null)
  const virtualizer = useVirtualizer()
  const editorFontSize = useSettingsStore((state) => {
    return state.editorFontSize
  })
  const editorLineHeight = useSettingsStore((state) => {
    return state.editorLineHeight
  })
  const options = useDiffOptions(path, (current) => {
    rendered.current = current
  })
  const { annotations, selectedLines } = useDiffAnnotations(path)
  useSelectionEscape()
  useCommentFocus(path, rendered, virtualizer)

  return {
    oldFile: diff.oldFile ?? DiffSurface.emptyFile(path, 'old'),
    newFile: diff.newFile ?? DiffSurface.emptyFile(path, 'new'),
    options,
    metrics: DiffSurface.metrics(editorFontSize, editorLineHeight),
    annotations,
    selectedLines,
  }
}
