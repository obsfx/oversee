import type { ReactNode } from 'react'

export function KbdGroup({ children }: { children: ReactNode }) {
  return <span className={'inline-flex items-center gap-0.5'}>{children}</span>
}
