import type { FileChange } from '@/src/lib/change-set.ts'
import { Ratio } from '@/src/lib/ratio.ts'

export interface FilePosition {
  current: FileChange | null
  position: number
  total: number
  percent: number
  previousPath: string | null
  nextPath: string | null
}

export interface FileAnchor {
  comparisonKey: string | null
  index: number
}

export abstract class FileNavigationRules {
  static anchor(position: FilePosition, comparisonKey: string | null): FileAnchor | null {
    return position.current ? { comparisonKey, index: position.position - 1 } : null
  }

  static sameAnchor(previous: FileAnchor | null, next: FileAnchor) {
    return previous?.comparisonKey === next.comparisonKey && previous.index === next.index
  }

  static fallbackPath(
    files: readonly FileChange[],
    position: FilePosition,
    anchor: FileAnchor | null,
    comparisonKey: string | null,
  ) {
    if (position.current) {
      return null
    }
    const index = anchor?.comparisonKey === comparisonKey ? anchor.index : 0
    return files[Math.min(index, files.length - 1)]?.path ?? null
  }

  static of(files: readonly FileChange[], selectedPath: string | null): FilePosition {
    const index = files.findIndex((file) => {
      return file.path === selectedPath
    })
    const total = files.length
    const position = index + 1
    return {
      current: index >= 0 ? files[index] : null,
      position,
      total,
      percent: Ratio.percent(position, total),
      previousPath: index > 0 ? files[index - 1].path : null,
      nextPath: index >= 0 && index < total - 1 ? files[index + 1].path : null,
    }
  }
}
