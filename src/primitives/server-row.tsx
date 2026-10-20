import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

export type ServerRowTone = 'muted' | 'accent' | 'warning' | 'danger'

interface ServerRowProps {
  name: string
  languages: string
  status: ReactNode
  tone: ServerRowTone
  requirements?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

const TONES: Record<ServerRowTone, string> = {
  muted: 'text-fg-muted',
  accent: 'text-accent',
  warning: 'text-status-modified',
  danger: 'text-danger',
}

export function ServerRow({
  name,
  languages,
  status,
  tone,
  requirements,
  actions,
  children,
}: ServerRowProps) {
  return (
    <div className={'flex flex-col gap-1 rounded px-1.5 py-1 hover:bg-surface-hover'}>
      <div className={'flex items-center gap-2'}>
        <div className={'flex min-w-0 flex-1 flex-col gap-0.5'}>
          <span className={'flex min-w-0 items-baseline gap-1.5'}>
            <span className={'shrink-0 font-medium'}>{name}</span>
            <span className={'truncate text-mini text-fg-faint'} title={languages}>
              {languages}
            </span>
          </span>
          <span className={c('flex min-w-0 text-mini tabular-nums', TONES[tone])}>{status}</span>
          {requirements}
        </div>
        {actions && <div className={'flex shrink-0 items-center gap-1'}>{actions}</div>}
      </div>
      {children}
    </div>
  )
}
