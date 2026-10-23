import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

interface TreeScrollerProps extends ComponentProps<'div'> {
  totalSize: number
}

export function TreeScroller({ totalSize, className, children, ...props }: TreeScrollerProps) {
  return (
    <div
      role={'tree'}
      tabIndex={0}
      className={c(
        'h-full overflow-x-hidden overflow-y-auto text-xs outline-none',
        'focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-inset',
        className,
      )}
      {...props}
    >
      <div className={'relative min-h-full w-full'} style={{ height: totalSize }}>
        {children}
      </div>
    </div>
  )
}
