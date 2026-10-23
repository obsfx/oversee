import type { BaseCodeOptions, PostRenderPhase } from '@pierre/diffs'
import { useVirtualizer } from '@pierre/diffs/react'
import { useRef } from 'react'
import { useDefinitionInteractions } from '@/src/hooks/use-definition-interactions.ts'
import { useDiffTheme } from '@/src/hooks/use-diff-theme.ts'
import { useEditorMetrics } from '@/src/hooks/use-editor-metrics.ts'
import { useLineReveal } from '@/src/hooks/use-line-reveal.ts'
import type { FileSide } from '@/src/lib/change-set.ts'
import type { TabReveal } from '@/src/lib/definition-tabs.ts'
import type { RenderedLines } from '@/src/lib/diff-line-reveal.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { SymbolHighlights } from '@/src/lib/symbol-highlight.ts'
import { useSymbolHighlightStore } from '@/src/store/symbol-highlight-store.ts'

export const useCodeSurface = (
  path: string,
  reveal: TabReveal | null,
  lastLines: Record<FileSide, number>,
) => {
  const rendered = useRef<RenderedLines | null>(null)
  const virtualizer = useVirtualizer()
  const metrics = useEditorMetrics()
  const { themes, themeType } = useDiffTheme()
  const { tokenHandlers, definition } = useDefinitionInteractions(path)
  const revealing = useLineReveal(reveal, rendered, virtualizer, lastLines)
  const highlight = useSymbolHighlightStore((state) => {
    return state.highlight
  })
  const base: BaseCodeOptions = {
    theme: themes,
    themeType,
    disableFileHeader: true,
    overflow: 'scroll',
    unsafeCSS: DiffSurface.css + SymbolHighlights.css(highlight, path),
  }

  return {
    rendered,
    virtualizer,
    metrics,
    revealing,
    definition,
    tokenHandlers,
    base,
    onPostRender: (node: HTMLElement, instance: object, phase: PostRenderPhase) => {
      rendered.current = phase === 'unmount' ? null : { node, instance }
    },
  }
}
