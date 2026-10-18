import type { ComponentProps } from 'react'
import { c } from '../c.ts'

export function ChipButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={'button'}
      className={c(
        'flex h-6 max-w-[28rem] min-w-0 cursor-pointer items-center gap-1.5 rounded px-1.5 text-xs outline-none',
        'hover:bg-surface-hover focus-visible:ring-1 focus-visible:ring-fg-faint',
        'disabled:cursor-default disabled:text-fg-faint disabled:hover:bg-transparent',
        'data-[popup-open]:bg-surface-active',
        className,
      )}
      {...props}
    />
  )
}
