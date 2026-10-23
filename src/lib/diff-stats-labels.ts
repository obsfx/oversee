import { CountLabels } from '@/src/lib/count-labels.ts'
import type { DiffStats } from '@/src/lib/diff-stats.ts'

export abstract class DiffStatsLabels {
  static description({ additions, deletions, files }: DiffStats) {
    return `${CountLabels.of(additions, 'line')} added, ${CountLabels.of(deletions, 'line')} removed across ${CountLabels.of(files, 'file')}`
  }
}
