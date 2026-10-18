import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

export function TextButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={'button'}
      className={c(
        'cursor-pointer rounded-sm text-accent outline-none hover:underline focus-visible:ring-1 focus-visible:ring-fg-faint',
        className,
      )}
      {...props}
    />
  )
}
