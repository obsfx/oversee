import type { ComponentProps, ReactNode } from 'react'
import { VscChevronDown } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

interface SidebarTitleButtonProps extends ComponentProps<'button'> {
  icon: ReactNode
}

export function SidebarTitleButton({
  icon,
  className,
  children,
  ...props
}: SidebarTitleButtonProps) {
  return (
    <button
      type={'button'}
      className={c(
        'flex h-6 min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 font-medium text-sidebar-fg outline-none',
        'transition-[scale,background-color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-97 motion-reduce:active:scale-100',
        'hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-accent/40 data-popup-open:bg-sidebar-hover',
        className,
      )}
      {...props}
    >
      <span className={'flex shrink-0 text-sidebar-muted'}>{icon}</span>
      <span className={'truncate'}>{children}</span>
      <VscChevronDown aria-hidden={true} className={'size-3.5 shrink-0 text-sidebar-muted'} />
    </button>
  )
}
