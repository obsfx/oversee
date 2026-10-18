import type { ReactNode } from 'react'

interface SessionSummaryProps {
  leading: ReactNode
  title: string
  subtitle: string
  meta: string
}

export function SessionSummary({ leading, title, subtitle, meta }: SessionSummaryProps) {
  return (
    <span className={'flex min-w-0 flex-1 items-start gap-1.5 text-left'}>
      <span className={'pt-px'}>{leading}</span>
      <span className={'flex min-w-0 flex-1 flex-col gap-0.5'}>
        <span className={'truncate font-medium'}>{title}</span>
        <span className={'flex items-center gap-1.5 text-mini text-fg-muted'}>
          <span className={'truncate'}>{subtitle}</span>
          <span className={'shrink-0 text-fg-faint'}>{meta}</span>
        </span>
      </span>
    </span>
  )
}
