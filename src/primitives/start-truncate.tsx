import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface StartTruncateProps {
  className?: string
  title?: string
  children: ReactNode
}

export function StartTruncate({ className, title, children }: StartTruncateProps) {
  return (
    <span dir={'rtl'} title={title} className={c('min-w-0 truncate', className)}>
      <bdi>{children}</bdi>
    </span>
  )
}
