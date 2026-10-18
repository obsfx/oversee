import { CountLabels } from '@/src/lib/count-labels.ts'
import { DiffStatsRules } from '@/src/lib/diff-stats.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'

export const useDiffStats = () => {
  const { state } = useChangeSet()
  if (state.status !== 'ready') {
    return null
  }
  const stats = DiffStatsRules.of(state.data.changes)
  const description = `${CountLabels.of(stats.additions, 'line')} added, ${CountLabels.of(stats.deletions, 'line')} removed across ${CountLabels.of(stats.files, 'file')}`
  return { ...stats, description }
}
