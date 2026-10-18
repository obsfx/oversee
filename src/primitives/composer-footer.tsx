import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface ComposerFooterProps {
  hint: ReactNode
  error?: string | null
  children: ReactNode
}

export function ComposerFooter({ hint, error = null, children }: ComposerFooterProps) {
  return (
    <div className={'flex items-center justify-between gap-2 border-t border-line px-1.5 py-1'}>
      <span
        className={c(
          'flex items-center gap-2.5 text-micro',
          error ? 'text-danger' : 'text-fg-faint',
        )}
      >
        {error ?? hint}
      </span>
      <div className={'flex gap-1'}>{children}</div>
    </div>
  )
}
