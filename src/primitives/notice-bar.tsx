import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'
import { StartTruncate } from '@/src/primitives/start-truncate.tsx'

export type NoticeTone = 'accent' | 'warning' | 'danger' | 'success' | 'neutral'

interface NoticeBarProps {
  tone: NoticeTone
  icon: ReactNode
  title: string
  detail: string
  detailTruncation?: 'end' | 'start'
  busy?: boolean
  progress?: ReactNode
  children?: ReactNode
}

const TONES: Record<NoticeTone, string> = {
  accent: 'border-accent/20 bg-accent-subtle/60',
  warning: 'border-status-modified/25 bg-status-modified/8',
  danger: 'border-danger/25 bg-danger/8',
  success: 'border-reviewed/25 bg-reviewed/8',
  neutral: 'border-line bg-surface-subtle',
}

const ICONS: Record<NoticeTone, string> = {
  accent: 'text-accent',
  warning: 'text-status-modified',
  danger: 'text-danger',
  success: 'text-reviewed',
  neutral: 'text-fg-faint',
}

export function NoticeBar({
  tone,
  icon,
  title,
  detail,
  detailTruncation = 'end',
  busy = false,
  progress,
  children,
}: NoticeBarProps) {
  return (
    <div
      role={'status'}
      aria-busy={busy}
      className={c(
        'relative flex h-6 shrink-0 items-center gap-1.5 border-b px-2 text-xs',
        'transition-opacity duration-150 ease-out starting:opacity-0',
        TONES[tone],
      )}
    >
      <span className={c('flex shrink-0', ICONS[tone])}>{icon}</span>
      <span className={'shrink-0 font-medium'}>{title}</span>
      {detailTruncation === 'start' && (
        <StartTruncate className={'text-fg-muted tabular-nums'}>{detail}</StartTruncate>
      )}
      {detailTruncation === 'end' && (
        <span className={'min-w-0 truncate text-fg-muted tabular-nums'}>{detail}</span>
      )}
      {children && <span className={'ml-auto flex shrink-0 items-center gap-3'}>{children}</span>}
      {progress && <span className={'absolute inset-x-0 bottom-0'}>{progress}</span>}
    </div>
  )
}
