import type { ReactNode } from 'react'

export function SidebarToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'flex shrink-0 items-center gap-0.5 border-y border-black/5 pr-1 dark:border-white/5'
      }
    >
      {children}
    </div>
  )
}
