import { Popover } from '@base-ui/react/popover'
import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface PopoverSurfaceProps {
  align: 'start' | 'end'
  className?: string
  children: ReactNode
}

export function PopoverSurface({ align, className, children }: PopoverSurfaceProps) {
  return (
    <Popover.Portal>
      <Popover.Positioner side={'bottom'} align={align} sideOffset={4} className={'z-50'}>
        <Popover.Popup
          className={c(
            'rounded-md border border-line bg-popup text-xs text-fg shadow-lg outline-none',
            className,
          )}
        >
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )
}
