import type { ComponentProps } from 'react'
import { c } from '../c.ts'

interface DiffStatProps extends ComponentProps<'span'> {
  additions: number
  deletions: number
}

export function DiffStat({ additions, deletions, className, ...props }: DiffStatProps) {
  return (
    <span
      className={c(
        'flex shrink-0 items-center gap-1.5 px-1 text-xs font-medium tabular-nums',
        className,
      )}
      {...props}
    >
      <span className={'text-status-added'}>{`+${additions}`}</span>
      <span className={'text-status-deleted'}>{`-${deletions}`}</span>
    </span>
  )
}
