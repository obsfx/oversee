import type { ReactNode } from 'react'

interface DiffPlaceholderProps {
  icon: ReactNode
  title: string
  detail: string
}

export function DiffPlaceholder({ icon, title, detail }: DiffPlaceholderProps) {
  return (
    <div className={'flex h-full flex-col items-center justify-center gap-1 px-4 text-center'}>
      <span className={'mb-0.5 text-xl text-fg-faint'}>{icon}</span>
      <span className={'font-medium text-fg'}>{title}</span>
      <span className={'text-mini text-fg-muted'}>{detail}</span>
    </div>
  )
}
