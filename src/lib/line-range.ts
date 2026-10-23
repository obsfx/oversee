import type { AnnotationSide, SelectedLineRange } from '@pierre/diffs/react'
import * as v from 'valibot'
import type { FileSide } from '@/src/lib/change-set.ts'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

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
  static readonly sideSchema = v.picklist(SIDES)

  static readonly schema = v.object({
    start: ValueSchemas.positiveInteger,
    end: ValueSchemas.positiveInteger,
    side: LineRanges.sideSchema,
    endSide: LineRanges.sideSchema,
  })

  static fromSelection({ start, end, side, endSide }: SelectedLineRange): LineRange {
    const startSide = side ?? 'additions'
    const finalSide = endSide ?? startSide
    if (end >= start) {
      return { start, end, side: startSide, endSide: finalSide }
    }
    return { start: end, end: start, side: finalSide, endSide: startSide }
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

export abstract class FileSides {
  static fromAnnotation(side: AnnotationSide): FileSide {
    return side === 'deletions' ? 'old' : 'new'
  }

  static toAnnotation(side: FileSide): AnnotationSide {
    return side === 'old' ? 'deletions' : 'additions'
  }
}
