import { Tabs } from '@base-ui/react/tabs'
import type { ReactNode } from 'react'

interface PopoverTabsHeaderProps {
  meta: string
  children: ReactNode
}

export function PopoverTabsHeader({ meta, children }: PopoverTabsHeaderProps) {
  return (
    <div className={'flex items-center justify-between border-b border-line px-1.5 py-1'}>
      <Tabs.List className={'flex gap-0.5'}>{children}</Tabs.List>
      <span className={'pr-0.5 text-fg-muted'}>{meta}</span>
    </div>
  )
}
