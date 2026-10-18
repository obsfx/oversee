import type { ComponentProps } from 'react'
import { c } from '../c.ts'

export function IconButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={'button'}
      className={c(
        'flex h-6 min-w-6 cursor-pointer items-center justify-center gap-1 rounded px-1 text-sm text-fg-muted outline-none',
        'hover:bg-surface-hover hover:text-fg focus-visible:ring-1 focus-visible:ring-fg-faint',
        'data-[popup-open]:bg-surface-active data-[popup-open]:text-fg',
        className,
      )}
      {...props}
    />
  )
}
