import { c } from '@/src/c.ts'

interface LineCountsProps {
  additions: number
  deletions: number
  title: string
}

export function LineCounts({ additions, deletions, title }: LineCountsProps) {
  return (
    <span title={title} className={'flex shrink-0 gap-1 text-mini text-sidebar-muted tabular-nums'}>
      <span className={c(additions > 0 && 'text-status-added')}>+{additions}</span>
      <span className={c(deletions > 0 && 'text-status-deleted')}>-{deletions}</span>
    </span>
  )
}
