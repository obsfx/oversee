import type { FileDiffOptions, SelectedLineRange } from '@pierre/diffs/react'
import { useDiffTheme } from '@/src/hooks/use-diff-theme.ts'
import type { DiffAnnotationMeta } from '@/src/lib/comment-annotations.ts'
import type { RenderedDiff } from '@/src/lib/diff-line-reveal.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useDiffViewStore } from '@/src/store/diff-view-store.ts'

export const useDiffOptions = (
  path: string,
  onRendered: (rendered: RenderedDiff | null) => void,
) => {
  const viewMode = useDiffViewStore((state) => {
    return state.viewMode
  })
  const unchangedExpanded = useDiffViewStore((state) => {
    return state.unchangedExpanded
  })
  const { themes, themeType } = useDiffTheme()
  const select = useAnnotationStore((state) => {
    return state.select
  })

  const track = (range: SelectedLineRange | null, selecting: boolean) => {
    select(range ? { path, range: LineRanges.fromSelection(range) } : null, selecting)
  }

  const options: FileDiffOptions<DiffAnnotationMeta, undefined> = {
    theme: themes,
    themeType,
    diffStyle: viewMode,
    expandUnchanged: unchangedExpanded,
    disableFileHeader: true,
    overflow: 'scroll',
    lineHoverHighlight: 'both',
    enableLineSelection: true,
    unsafeCSS: DiffSurface.css,
    onLineSelectionStart: (range) => {
      track(range, true)
    },
    onLineSelectionChange: (range) => {
      track(range, true)
    },
    onLineSelectionEnd: (range) => {
      track(range, false)
    },
    onPostRender: (node, instance, phase) => {
      onRendered(phase === 'unmount' ? null : { node, instance })
    },
  }

  return options
}
