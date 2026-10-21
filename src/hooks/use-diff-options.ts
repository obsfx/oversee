import type { BaseCodeOptions, PostRenderPhase } from '@pierre/diffs'
import type { FileDiffOptions, SelectedLineRange } from '@pierre/diffs/react'
import type { DiffAnnotationMeta } from '@/src/lib/comment-annotations.ts'
import type { TokenHandlers } from '@/src/lib/definition-hover.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useDiffViewStore } from '@/src/store/diff-view-store.ts'

interface DiffOptionInputs {
  base: BaseCodeOptions
  onPostRender: (node: HTMLElement, instance: object, phase: PostRenderPhase) => void
  tokenHandlers: TokenHandlers
  expandUnchanged: boolean
}

export const useDiffOptions = (
  path: string,
  { base, onPostRender, tokenHandlers, expandUnchanged }: DiffOptionInputs,
) => {
  const viewMode = useDiffViewStore((state) => {
    return state.viewMode
  })
  const unchangedExpanded = useDiffViewStore((state) => {
    return state.unchangedExpanded
  })
  const select = useAnnotationStore((state) => {
    return state.select
  })

  const track = (range: SelectedLineRange | null, selecting: boolean) => {
    select(range ? { path, range: LineRanges.fromSelection(range) } : null, selecting)
  }

  const options: FileDiffOptions<DiffAnnotationMeta, undefined> = {
    ...base,
    diffStyle: viewMode,
    expandUnchanged: expandUnchanged || unchangedExpanded,
    lineHoverHighlight: 'both',
    enableLineSelection: true,
    onLineSelectionStart: (range) => {
      track(range, true)
    },
    onLineSelectionChange: (range) => {
      track(range, true)
    },
    onLineSelectionEnd: (range) => {
      track(range, false)
    },
    onPostRender,
    onTokenEnter: tokenHandlers.onTokenEnter,
    onTokenLeave: tokenHandlers.onTokenLeave,
    onTokenClick: tokenHandlers.onTokenClick,
  }

  return options
}
