import { Tabs } from '@base-ui/react/tabs'
import { c } from '@/src/c.ts'

interface PopoverTabProps {
  value: string
  label: string
  count: number
}

export function PopoverTab({ value, label, count }: PopoverTabProps) {
  return (
    <Tabs.Tab
      value={value}
      className={c(
        'flex cursor-pointer items-center gap-1 rounded-sm px-1.5 leading-5 text-fg-muted outline-none hover:text-fg',
        'focus-visible:ring-1 focus-visible:ring-fg-faint data-active:bg-surface-active data-active:text-fg',
      )}
    >
      {label}
      <span className={'text-fg-faint tabular-nums'}>{count}</span>
    </Tabs.Tab>
  )
}
