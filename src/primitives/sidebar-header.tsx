import type { ReactNode } from 'react'

export function SidebarHeader({ children }: { children: ReactNode }) {
  return (
    <div
      className={'flex h-7 shrink-0 items-center border-b border-black/5 px-1 dark:border-white/5'}
    >
      {children}
    </div>
  )
}
