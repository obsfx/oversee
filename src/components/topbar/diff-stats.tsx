import { useDiffStats } from '@/src/hooks/use-diff-stats.ts'
import { DiffStat } from '@/src/primitives/diff-stat.tsx'

export function DiffStats() {
  const stats = useDiffStats()
  if (!stats) {
    return null
  }
  return (
    <DiffStat
      additions={stats.additions}
      deletions={stats.deletions}
      title={stats.description}
      aria-label={stats.description}
    />
  )
}
