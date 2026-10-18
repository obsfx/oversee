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

export abstract class FileNavigationRules {
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
