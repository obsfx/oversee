import { Select } from '@base-ui/react/select'
import type { ReactNode } from 'react'

export function SelectSurface({ children }: { children: ReactNode }) {
  return (
    <Select.Portal>
      <Select.Positioner sideOffset={4} alignItemWithTrigger={false} className={'z-50'}>
        <Select.Popup
          className={
            'min-w-(--anchor-width) rounded-md border border-line bg-popup p-1 text-xs text-fg shadow-lg outline-none'
          }
        >
          {children}
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  )
}
