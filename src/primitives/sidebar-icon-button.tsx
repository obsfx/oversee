import type { ComponentProps } from 'react'
import { c } from '@/src/c.ts'

export function SidebarIconButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type={'button'}
      className={c(
        'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-muted outline-none',
        'transition-[scale,background-color,color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'hover:bg-sidebar-hover hover:text-sidebar-fg active:scale-97',
        'focus-visible:ring-2 focus-visible:ring-accent/40',
        'aria-pressed:bg-sidebar-selected aria-pressed:text-sidebar-fg',
        'disabled:pointer-events-none disabled:opacity-65',
        '[&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}
