import type { ComponentProps } from 'react'
import { c } from '../c.ts'

export function MenuSurface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role={'menu'}
      className={c(
        'z-50 min-w-40 rounded-md border border-line bg-popup p-0.5 text-xs text-fg shadow-md',
        className,
      )}
      {...props}
    />
  )
}
