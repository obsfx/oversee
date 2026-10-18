import plur from 'plur'
import { DiffStatsRules } from '../lib/diff-stats.ts'
import { useChangeSet } from './use-change-set.ts'

export const useDiffStats = () => {
  const { state } = useChangeSet()
  if (state.status !== 'ready') {
    return null
  }
  const stats = DiffStatsRules.of(state.data.changes)
  const description = `${stats.additions} ${plur('line', stats.additions)} added, ${stats.deletions} ${plur('line', stats.deletions)} removed across ${stats.files} ${plur('file', stats.files)}`
  return { ...stats, description }
}
