import type { Virtualizer } from '@pierre/diffs'
import { type RefObject, useEffect, useEffectEvent, useState } from 'react'
import type { FileSide } from '@/src/lib/change-set.ts'
import type { TabReveal } from '@/src/lib/definition-tabs.ts'
import { DiffLineReveal, type RenderedLines } from '@/src/lib/diff-line-reveal.ts'
import { FileSides } from '@/src/lib/line-range.ts'

const REVEAL_TIMEOUT_MS = 10000
const JUMP_INTERVAL_MS = 120
const INTERRUPTIONS = ['wheel', 'pointerdown', 'keydown', 'touchstart'] as const

export const useLineReveal = (
  reveal: TabReveal | null,
  rendered: RefObject<RenderedLines | null>,
  virtualizer: Virtualizer | undefined,
  lastLines: Record<FileSide, number>,
) => {
  const [landed, setLanded] = useState<TabReveal | null>(null)
  const targetLine = useEffectEvent((target: TabReveal) => {
    return Math.max(1, Math.min(target.line, lastLines[target.side]))
  })

  useEffect(() => {
    if (!reveal) {
      return
    }
    const target = targetLine(reveal)
    let frame = 0
    let nextJump = 0
    const deadline = performance.now() + REVEAL_TIMEOUT_MS
    const anchor = { lineNumber: target, side: FileSides.toAnnotation(reveal.side) }
    const release = () => {
      cancelAnimationFrame(frame)
      for (const type of INTERRUPTIONS) {
        window.removeEventListener(type, stop, true)
      }
    }
    const stop = () => {
      release()
      setLanded(reveal)
    }
    const step = () => {
      const now = performance.now()
      const current = rendered.current
      if (current) {
        const line = DiffLineReveal.lineElement(current.node, target, reveal.side)
        if (line) {
          if (virtualizer) {
            DiffLineReveal.scrollToLine(virtualizer, current, anchor)
          }
          DiffLineReveal.flash(current.node, target, reveal.side)
          stop()
          return
        }
        if (virtualizer && now >= nextJump) {
          DiffLineReveal.scrollToLine(virtualizer, current, anchor)
          nextJump = now + JUMP_INTERVAL_MS
        }
      }
      if (now < deadline) {
        frame = requestAnimationFrame(step)
        return
      }
      stop()
    }
    for (const type of INTERRUPTIONS) {
      window.addEventListener(type, stop, { capture: true, passive: true })
    }
    frame = requestAnimationFrame(step)
    return release
  }, [reveal, rendered, virtualizer])

  return reveal !== null && landed !== reveal
}
