import { Menu } from '@base-ui/react/menu'
import type { ReactNode } from 'react'
import { VscCheck } from 'react-icons/vsc'

interface MenuRadioOptionProps {
  value: string
  icon: ReactNode
  title: string
  detail: string
}

export function MenuRadioOption({ value, icon, title, detail }: MenuRadioOptionProps) {
  return (
    <Menu.RadioItem
      value={value}
      closeOnClick={true}
      className={
        'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 outline-none data-highlighted:bg-surface-hover'
      }
    >
      <span className={'flex shrink-0 text-fg-muted'}>{icon}</span>
      <span className={'min-w-0 flex-1'}>
        <span className={'block'}>{title}</span>
        <span className={'block text-mini text-fg-muted'}>{detail}</span>
      </span>
      <Menu.RadioItemIndicator className={'flex shrink-0 text-accent'}>
        <VscCheck aria-hidden={true} className={'size-3.5'} />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  )
}
