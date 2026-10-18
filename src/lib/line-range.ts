import type { AnnotationSide, SelectedLineRange } from '@pierre/diffs/react'
import { ValueGuards } from '@/src/lib/value-guards.ts'

const SIDES: readonly AnnotationSide[] = ['additions', 'deletions']

export interface LineRange {
  start: number
  end: number
  side: AnnotationSide
  endSide: AnnotationSide
}

export interface LineAnchor {
  side: AnnotationSide
  lineNumber: number
}

export abstract class LineRanges {
  static isSide(value: unknown): value is AnnotationSide {
    return ValueGuards.isOneOf(SIDES, value)
  }

  static fromSelection({ start, end, side, endSide }: SelectedLineRange): LineRange {
    const startSide = side ?? 'additions'
    const finalSide = endSide ?? startSide
    return end >= start
      ? { start, end, side: startSide, endSide: finalSide }
      : { start: end, end: start, side: finalSide, endSide: startSide }
  }

  static anchor(range: LineRange): LineAnchor {
    return { side: range.endSide, lineNumber: range.end }
  }

  static anchorKey({ side, lineNumber }: LineAnchor) {
    return `${side}:${lineNumber}`
  }

  static label({ start, end }: LineRange) {
    return start === end ? `Line ${start}` : `Lines ${start}-${end}`
  }

  static shortLabel({ start, end }: LineRange) {
    return start === end ? `L${start}` : `L${start}-${end}`
  }
}
