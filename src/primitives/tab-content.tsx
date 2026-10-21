import type { ReactNode } from 'react'

interface TabContentProps {
  tabbed: boolean
  label: string
  children: ReactNode
}

export function TabContent({ tabbed, label, children }: TabContentProps) {
  return (
    <main
      role={tabbed ? 'tabpanel' : undefined}
      aria-label={tabbed ? label : undefined}
      className={'min-h-0 flex-1'}
    >
      {children}
    </main>
  )
}
