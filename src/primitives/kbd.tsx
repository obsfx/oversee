import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={c(
        'pointer-events-none inline-flex h-4 min-w-4 items-center justify-center gap-0.5 rounded-sm border border-line bg-surface-subtle px-1 font-ui text-micro leading-none font-medium text-fg-muted select-none',
        'shadow-[0_1px_0_var(--color-line)]',
        '[&_svg]:size-2.5',
        className,
      )}
      {...props}
    />
  )
}
