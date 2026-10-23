import type { ReactNode } from 'react'

interface VirtualRowProps {
  start: number
  children: ReactNode
}

export function VirtualRow({ start, children }: VirtualRowProps) {
  return (
    <div className={'absolute inset-x-0 top-0'} style={{ transform: `translateY(${start}px)` }}>
      {children}
    </div>
  )
}
