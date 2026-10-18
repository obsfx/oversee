import type { ReactNode } from 'react'

interface CenteredStatusProps {
  icon: ReactNode
  children: ReactNode
}

export function CenteredStatus({ icon, children }: CenteredStatusProps) {
  return (
    <div
      className={
        'flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sidebar-muted'
      }
    >
      <span className={'text-xl'}>{icon}</span>
      {children}
    </div>
  )
}
