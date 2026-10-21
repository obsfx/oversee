import { Popover } from '@base-ui/react/popover'
import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface AnchoredPopoverSurfaceProps {
  open: boolean
  anchor: HTMLElement | null
  className?: string
  onPointerEnter: () => void
  onPointerLeave: () => void
  onClose: () => void
  children: ReactNode
}

export function AnchoredPopoverSurface({
  open,
  anchor,
  className,
  onPointerEnter,
  onPointerLeave,
  onClose,
  children,
}: AnchoredPopoverSurfaceProps) {
  return (
    <Popover.Root
      open={open && anchor !== null}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side={'bottom'}
          align={'start'}
          sideOffset={4}
          collisionPadding={8}
          className={'z-50'}
        >
          <Popover.Popup
            initialFocus={false}
            finalFocus={false}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            className={c(
              'rounded-md border border-line bg-popup text-xs text-fg shadow-lg outline-none',
              'origin-(--transform-origin) transition-[opacity,scale] duration-125 ease-[cubic-bezier(0.23,1,0.32,1)]',
              'data-ending-style:scale-97 data-ending-style:opacity-0 data-starting-style:scale-97 data-starting-style:opacity-0',
              className,
            )}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
