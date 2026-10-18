import type { ComponentProps } from 'react'
import { c } from '../c.ts'

interface SegmentedOptionProps extends ComponentProps<'button'> {
  active: boolean
}

export function SegmentedOption({ active, className, ...props }: SegmentedOptionProps) {
  return (
    <button
      type={'button'}
      aria-pressed={active}
      className={c(
        'cursor-pointer rounded-sm px-1.5 leading-4 capitalize outline-none focus-visible:ring-1 focus-visible:ring-fg-faint',
        active ? 'bg-surface-active text-fg' : 'text-fg-muted hover:text-fg',
        className,
      )}
      {...props}
    />
  )
}
