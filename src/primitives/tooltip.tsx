import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import type { ReactElement, ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface TooltipProps {
  label: ReactNode
  children: ReactElement
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={6} className={'z-60'}>
          <BaseTooltip.Popup
            className={c(
              'rounded bg-fg px-1.5 py-0.5 text-mini whitespace-nowrap text-surface shadow-md outline-none',
              'origin-(--transform-origin) transition-[scale,opacity] duration-125 ease-[cubic-bezier(0.23,1,0.32,1)]',
              'data-ending-style:scale-97 data-ending-style:opacity-0 data-starting-style:scale-97 data-starting-style:opacity-0',
              'data-instant:duration-0',
            )}
          >
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
