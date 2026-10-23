import { DiffStatsRules } from '@/src/lib/diff-stats.ts'
import { DiffStatsLabels } from '@/src/lib/diff-stats-labels.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'

export const useDiffStats = () => {
  const { state } = useChangeSet()
  if (state.status !== 'ready') {
    return null
  }
  const stats = DiffStatsRules.of(state.data.changes)
  return { ...stats, description: DiffStatsLabels.description(stats) }
}
