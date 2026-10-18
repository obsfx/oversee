import { Select } from '@base-ui/react/select'
import type { CSSProperties } from 'react'
import { VscCheck } from 'react-icons/vsc'

interface SelectOptionProps {
  value: number | string
  label: string
  style?: CSSProperties
}

export function SelectOption({ value, label, style }: SelectOptionProps) {
  return (
    <Select.Item
      value={value}
      style={style}
      className={
        'flex h-6 cursor-pointer items-center justify-between gap-3 rounded px-1.5 whitespace-nowrap outline-none data-[highlighted]:bg-surface-hover'
      }
    >
      <Select.ItemText>{label}</Select.ItemText>
      <Select.ItemIndicator>
        <VscCheck />
      </Select.ItemIndicator>
    </Select.Item>
  )
}
