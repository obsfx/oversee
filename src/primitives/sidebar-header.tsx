import type { ReactNode } from 'react'

export function SidebarHeader({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        '@container flex min-h-10 shrink-0 items-center gap-2 px-2 py-1.5 whitespace-nowrap'
      }
    >
      {children}
    </div>
  )
}
