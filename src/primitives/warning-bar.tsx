import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'
import { TextButton } from '@/src/primitives/text-button.tsx'

interface WarningBarProps {
  icon: ReactNode
  title: string
  detail: string
  actionLabel: string
  onAction: () => void
}

export function WarningBar({ icon, title, detail, actionLabel, onAction }: WarningBarProps) {
  return (
    <div
      role={'status'}
      className={c(
        'flex h-6 shrink-0 items-center gap-1.5 border-b border-status-modified/25 bg-status-modified/8 px-2 text-xs',
        'transition-opacity duration-150 ease-out starting:opacity-0',
      )}
    >
      <span className={'flex shrink-0 text-status-modified'}>{icon}</span>
      <span className={'shrink-0 font-medium'}>{title}</span>
      <span className={'min-w-0 truncate text-fg-muted'}>{detail}</span>
      <TextButton className={'ml-auto shrink-0'} onClick={onAction}>
        {actionLabel}
      </TextButton>
    </div>
  )
}
