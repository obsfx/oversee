import { Combobox } from '@base-ui/react/combobox'
import type { ComponentProps } from 'react'
import { VscCheck } from 'react-icons/vsc'
import { c } from '../c.ts'

interface ComboboxOptionProps extends Omit<ComponentProps<typeof Combobox.Item>, 'children'> {
  value: string
}

export function ComboboxOption({ value, className, ...props }: ComboboxOptionProps) {
  return (
    <Combobox.Item
      value={value}
      className={c(
        'flex h-6 cursor-pointer items-center justify-between gap-1 rounded px-1.5 outline-none data-[highlighted]:bg-surface-hover',
        className,
      )}
      {...props}
    >
      <span className={'truncate'}>{value}</span>
      <Combobox.ItemIndicator>
        <VscCheck />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  )
}
