import { Popover } from '@base-ui/react/popover'
import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface PopoverSurfaceProps {
  align: 'start' | 'end'
  caret?: boolean
  className?: string
  children: ReactNode
}

export function PopoverSurface({ align, caret = false, className, children }: PopoverSurfaceProps) {
  return (
    <Popover.Portal>
      <Popover.Positioner
        side={'bottom'}
        align={align}
        sideOffset={caret ? 8 : 4}
        className={'z-50'}
      >
        <Popover.Popup
          className={c(
            'rounded-md border border-line bg-popup text-xs text-fg shadow-lg outline-none',
            className,
          )}
        >
          {caret && (
            <Popover.Arrow
              className={c(
                'size-2.5 border-t border-l border-line bg-popup',
                'data-[side=bottom]:-top-[0.3125rem] data-[side=bottom]:rotate-45',
                'data-[side=top]:-bottom-[0.3125rem] data-[side=top]:rotate-225',
              )}
            />
          )}
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )
}
