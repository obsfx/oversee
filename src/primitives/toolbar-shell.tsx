import type { ReactNode } from 'react'

export function ToolbarShell({ children }: { children: ReactNode }) {
  return (
    <div
      role={'toolbar'}
      aria-label={'File toolbar'}
      className={
        'flex h-7 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-subtle px-1.5 text-xs text-fg'
      }
    >
      {children}
    </div>
  )
}
