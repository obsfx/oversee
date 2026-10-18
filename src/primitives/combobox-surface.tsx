import { Combobox } from '@base-ui/react/combobox'
import type { ReactNode } from 'react'

interface ComboboxSurfaceProps {
  label: string
  children: ReactNode
}

export function ComboboxSurface({ label, children }: ComboboxSurfaceProps) {
  return (
    <Combobox.Portal>
      <Combobox.Positioner align={'end'} sideOffset={4} className={'z-50'}>
        <Combobox.Popup
          aria-label={label}
          className={
            'w-56 rounded-md border border-line bg-popup text-xs text-fg shadow-lg outline-none'
          }
        >
          {children}
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  )
}
