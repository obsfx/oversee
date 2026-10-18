import type { ReactNode } from 'react'

interface NotificationsHeaderProps {
  meta: string
  action?: ReactNode
}

export function NotificationsHeader({ meta, action }: NotificationsHeaderProps) {
  return (
    <div className={'flex items-center justify-between border-b border-line px-2 py-1.5'}>
      <span className={'font-medium'}>Notifications</span>
      <span className={'flex items-center gap-2 text-fg-muted'}>
        {meta}
        {action}
      </span>
    </div>
  )
}
