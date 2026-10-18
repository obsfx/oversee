import type { ComponentProps } from 'react'
import { c } from '../c.ts'

export function FieldButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={'button'}
      className={c(
        'flex h-6 min-w-0 cursor-pointer items-center justify-between gap-1 rounded border border-line px-1.5 outline-none',
        'hover:border-fg-faint focus-visible:border-fg-faint data-[popup-open]:bg-surface-active',
        className,
      )}
      {...props}
    />
  )
}
