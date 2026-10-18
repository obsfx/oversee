import type { ReactNode } from 'react'
import { c } from '../c.ts'

interface InputFrameProps {
  invalid: boolean
  suffix?: string
  className?: string
  children: ReactNode
}

export function InputFrame({ invalid, suffix, className, children }: InputFrameProps) {
  return (
    <label
      className={c(
        'flex h-6 min-w-0 items-center gap-1 rounded border px-1.5',
        className,
        invalid ? 'border-danger' : 'border-line focus-within:border-fg-faint',
      )}
    >
      {children}
      {suffix && <span className={'text-fg-faint'}>{suffix}</span>}
    </label>
  )
}
