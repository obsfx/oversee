import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'
import { TreeMetrics } from '@/src/lib/tree-metrics.ts'

interface TreeRowProps extends ComponentProps<'div'> {
  depth: number
  selected: boolean
  marked?: boolean
  expanded?: boolean
}

export function TreeRow({
  depth,
  selected,
  marked = false,
  expanded,
  className,
  style,
  children,
  ...props
}: TreeRowProps) {
  return (
    <div
      role={'treeitem'}
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={expanded}
      className={c(
        'relative flex h-[var(--tree-row-height,1.25rem)] cursor-pointer items-center gap-1 pr-1.5 text-xs text-sidebar-fg select-none',
        selected ? 'bg-sidebar-selected' : 'hover:bg-sidebar-hover',
        className,
      )}
      style={{ paddingLeft: TreeMetrics.padding(depth), ...style }}
      {...props}
    >
      {marked && (
        <span
          aria-hidden={true}
          className={'absolute inset-y-0.5 left-0 w-0.5 rounded-r bg-accent'}
        />
      )}
      {children}
    </div>
  )
}
