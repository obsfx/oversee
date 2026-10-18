import type { ReactNode } from 'react'

export function TopbarShell({ children }: { children: ReactNode }) {
  return (
    <header
      className={
        'flex h-8 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-1.5 text-xs text-fg'
      }
    >
      {children}
    </header>
  )
}
