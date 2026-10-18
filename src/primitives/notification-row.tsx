import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface NotificationRowProps {
  leading: ReactNode
  title: string
  subtitle: string
  meta: string
  unread: boolean
  onSelect: () => void
}

export function NotificationRow({
  leading,
  title,
  subtitle,
  meta,
  unread,
  onSelect,
}: NotificationRowProps) {
  return (
    <button
      type={'button'}
      onClick={onSelect}
      className={c(
        'flex w-full cursor-pointer items-start gap-1.5 rounded px-1.5 py-1 text-left outline-none',
        'hover:bg-surface-hover focus-visible:bg-surface-hover',
      )}
    >
      <span className={'pt-px'}>{leading}</span>
      <span className={'flex min-w-0 flex-1 flex-col gap-0.5'}>
        <span className={c('truncate', unread ? 'font-medium text-fg' : 'text-fg-muted')}>
          {title}
        </span>
        <span className={'flex items-center gap-1.5 text-mini text-fg-muted'}>
          <span className={'truncate'}>{subtitle}</span>
          <span className={'shrink-0 text-fg-faint'}>{meta}</span>
        </span>
      </span>
      <span
        aria-hidden={true}
        className={c(
          'mt-1 size-1.5 shrink-0 rounded-full',
          unread ? 'bg-accent' : 'bg-transparent',
        )}
      />
    </button>
  )
}
