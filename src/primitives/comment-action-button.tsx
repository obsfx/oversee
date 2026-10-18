import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

export function CommentActionButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={'button'}
      className={c(
        'flex size-6 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-fg-muted shadow-sm outline-none',
        'hover:border-fg-faint hover:text-fg focus-visible:ring-1 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}
