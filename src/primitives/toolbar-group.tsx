import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface ToolbarGroupProps {
  grow?: boolean
  children: ReactNode
}

export function ToolbarGroup({ grow = false, children }: ToolbarGroupProps) {
  return (
    <div className={c('flex min-w-0 items-center gap-1', grow ? 'flex-1' : 'shrink-0')}>
      {children}
    </div>
  )
}
