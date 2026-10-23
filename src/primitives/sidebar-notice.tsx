import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'
import { type NoticeTone, NoticeTones } from '@/src/lib/notice-tones.ts'

interface SidebarNoticeProps {
  tone: NoticeTone
  icon: ReactNode
  title: string
  detail: string
  busy?: boolean
  progress?: ReactNode
  children?: ReactNode
}

export function SidebarNotice({
  tone,
  icon,
  title,
  detail,
  busy = false,
  progress,
  children,
}: SidebarNoticeProps) {
  return (
    <div
      role={'status'}
      aria-busy={busy}
      className={c(
        'relative flex shrink-0 items-start gap-1.5 border-b px-2 py-1 text-xs',
        'transition-opacity duration-150 ease-out starting:opacity-0',
        NoticeTones.surface[tone],
      )}
    >
      <span className={c('flex h-4 shrink-0 items-center', NoticeTones.icon[tone])}>{icon}</span>
      <span className={'min-w-0 flex-1'}>
        <span title={title} className={'block truncate font-medium'}>
          {title}
        </span>
        {detail !== '' && (
          <span title={detail} className={'block truncate text-sidebar-muted tabular-nums'}>
            {detail}
          </span>
        )}
      </span>
      {children && <span className={'flex h-4 shrink-0 items-center gap-2'}>{children}</span>}
      {progress && <span className={'absolute inset-x-0 bottom-0'}>{progress}</span>}
    </div>
  )
}
