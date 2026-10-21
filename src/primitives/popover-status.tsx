import type { ReactNode } from 'react'
import { VscInfo } from 'react-icons/vsc'
import { Spinner } from '@/src/primitives/spinner.tsx'

interface PopoverStatusProps {
  loading: boolean
  title: string
  detail?: string
  children?: ReactNode
}

export function PopoverStatus({ loading, title, detail, children }: PopoverStatusProps) {
  return (
    <div className={'flex items-start gap-2 p-2'}>
      <span className={'mt-0.5 flex shrink-0 text-fg-faint'}>
        {loading ? <Spinner /> : <VscInfo />}
      </span>
      <div className={'flex min-w-0 flex-col gap-0.5'}>
        <span className={'font-medium'}>{title}</span>
        {detail && <span className={'text-fg-muted'}>{detail}</span>}
        {children}
      </div>
    </div>
  )
}
