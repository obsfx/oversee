import type { ComponentProps } from 'react'
import { c } from '../c.ts'

export function BareInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={c(
        'w-full min-w-0 bg-transparent text-fg outline-none placeholder:text-fg-faint',
        className,
      )}
      {...props}
    />
  )
}
