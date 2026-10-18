import type { Virtualizer } from '@pierre/diffs'
import { type RefObject, useEffect } from 'react'
import { DiffLineReveal, type RenderedDiff } from '@/src/lib/diff-line-reveal.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'

const REVEAL_TIMEOUT_MS = 2000

export const useCommentFocus = (
  path: string,
  rendered: RefObject<RenderedDiff | null>,
  virtualizer: Virtualizer | undefined,
) => {
  const focus = useNavigationStore((navigation) => {
    return navigation.focus
  })
  const target = focus?.filePath === path ? focus : null

  useEffect(() => {
    if (!target) {
      return
    }
    let frame = 0
    let jumped = false
    const deadline = performance.now() + REVEAL_TIMEOUT_MS
    const reveal = () => {
      const element = document.getElementById(DiffSurface.commentElementId(target.commentId))
      if (element && DiffLineReveal.isLaidOut(element)) {
        element.scrollIntoView({ block: 'center', behavior: jumped ? 'instant' : 'smooth' })
        return
      }
      if (!jumped && virtualizer && rendered.current) {
        jumped = DiffLineReveal.scrollToLine(virtualizer, rendered.current, target.anchor)
      }
      if (performance.now() < deadline) {
        frame = requestAnimationFrame(reveal)
      }
    }
    reveal()
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [target, rendered, virtualizer])
}
