import type { ReactNode } from 'react'

export function TopbarGroup({ children }: { children: ReactNode }) {
  return <div className={'flex min-w-0 items-center gap-1'}>{children}</div>
}
