import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

export type ButtonVariant = 'surface' | 'ghost' | 'accent-subtle'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  icon?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  surface: c(
    'border-black/10 bg-linear-to-b from-white to-[#f6f7f9] text-sidebar-fg',
    'shadow-[0_1px_2px_rgb(0_0_0/8%),inset_0_1px_0_rgb(255_255_255/90%)]',
    'hover:border-black/15 hover:to-[#eef0f3]',
    'active:to-[#e9ecf0] active:shadow-[inset_0_2px_4px_rgb(0_0_0/10%)]',
    'dark:border-white/10 dark:from-[#232a33] dark:to-[#1b2129]',
    'dark:shadow-[0_1px_2px_rgb(0_0_0/40%),inset_0_1px_0_rgb(255_255_255/6%)]',
    'dark:hover:border-white/15 dark:hover:to-[#222831]',
  ),
  ghost: c(
    'border-transparent text-sidebar-muted',
    'hover:border-black/10 hover:bg-white hover:text-sidebar-fg hover:shadow-[0_1px_2px_rgb(0_0_0/8%)]',
    'active:bg-[#e9ecf0] active:shadow-[inset_0_2px_4px_rgb(0_0_0/10%)]',
    'dark:hover:border-white/10 dark:hover:bg-[#1f2630] dark:active:bg-[#1a2029]',
  ),
  'accent-subtle': c(
    'border-accent/25 bg-accent-subtle text-accent-strong',
    'shadow-[inset_0_1px_0_rgb(255_255_255/70%)] dark:shadow-none',
    'hover:border-accent/40',
    'active:shadow-[inset_0_2px_4px_rgb(91_63_166/18%)]',
  ),
}

export function Button({ variant = 'surface', icon = false, className, ...props }: ButtonProps) {
  return (
    <button
      type={'button'}
      className={c(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border text-xs font-medium whitespace-nowrap outline-none',
        'transition-[color,background-color,border-color,box-shadow] duration-150 ease-in-out',
        'focus-visible:ring-2 focus-visible:ring-accent/40',
        'disabled:pointer-events-none disabled:opacity-65',
        icon ? 'size-7 px-0' : 'h-6 px-2',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
