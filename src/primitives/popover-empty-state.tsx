import type { ReactNode } from 'react'

interface PopoverEmptyStateProps {
  icon: ReactNode
  children: ReactNode
}

export function PopoverEmptyState({ icon, children }: PopoverEmptyStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center gap-1.5 px-4 py-6 text-center text-fg-muted'
      }
    >
      <span className={'text-lg text-fg-faint'}>{icon}</span>
      {children}
    </div>
  )
}
