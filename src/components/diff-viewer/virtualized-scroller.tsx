import { Virtualizer } from '@pierre/diffs/react'
import { useIsClient } from '@uidotdev/usehooks'
import type { ReactNode } from 'react'

interface VirtualizedScrollerProps {
  className: string
  children: ReactNode
}

export function VirtualizedScroller({ className, children }: VirtualizedScrollerProps) {
  const mounted = useIsClient()

  return <Virtualizer className={className}>{mounted && children}</Virtualizer>
}
