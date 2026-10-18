import type { ReactNode } from 'react'

export function MutedHint({ children }: { children: ReactNode }) {
  return <div className={'px-2 py-1.5 text-fg-faint'}>{children}</div>
}
