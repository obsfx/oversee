import type { FileSide } from '@/src/lib/change-set.ts'
import { DiffLineReveal } from '@/src/lib/diff-line-reveal.ts'

export interface SymbolHighlight {
  path: string
  side: FileSide
  start: number
  end: number
  focus: number
}

const ACCENT = 'var(--color-accent)'
const RANGE_BAR = `color-mix(in srgb,${ACCENT} 55%,transparent)`
const FOCUS_TINT = `color-mix(in srgb,${ACCENT} 14%,transparent)`

export abstract class SymbolHighlights {
  static css(highlight: SymbolHighlight | null, path: string) {
    if (highlight === null || highlight.path !== path) {
      return ''
    }
    const range = DiffLineReveal.rangeSelector(highlight.start, highlight.end, highlight.side)
    const focus = DiffLineReveal.lineSelector(highlight.focus, highlight.side)
    return (
      `:is(${range}){box-shadow:inset 2px 0 0 ${RANGE_BAR}}` +
      `:is(${focus}){box-shadow:inset 2px 0 0 ${ACCENT};background-image:linear-gradient(${FOCUS_TINT},${FOCUS_TINT})}`
    )
  }
}
