import type { ReactNode } from 'react'

interface ComposerBarProps {
  label: string
  children: ReactNode
}

export function ComposerBar({ label, children }: ComposerBarProps) {
  return (
    <div
      className={
        'flex items-center justify-between gap-2 border-b border-line bg-surface-subtle px-1 py-0.5'
      }
    >
      {children}
      <span className={'pr-1 text-mini text-fg-faint'}>{label}</span>
    </div>
  )
}
