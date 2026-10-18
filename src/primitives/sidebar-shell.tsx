import type { ReactNode } from 'react'

export function SidebarShell({ children }: { children: ReactNode }) {
  return (
    <aside className={'flex h-full min-w-0 flex-col bg-sidebar text-xs text-sidebar-fg'}>
      {children}
    </aside>
  )
}
