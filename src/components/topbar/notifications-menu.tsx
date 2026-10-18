import { Popover } from '@base-ui/react/popover'
import { VscBell, VscBellDot } from 'react-icons/vsc'
import { NotificationList } from '@/src/components/topbar/notification-list.tsx'
import { NotificationSession } from '@/src/components/topbar/notification-session.tsx'
import { useNotificationsMenu } from '@/src/hooks/use-notifications-menu.ts'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { NotificationsHeader } from '@/src/primitives/notifications-header.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'

export function NotificationsMenu() {
  const menu = useNotificationsMenu()
  const hasUnread = menu.unreadCount > 0
  const Icon = hasUnread ? VscBellDot : VscBell
  let markAll = null
  if (hasUnread) {
    markAll = <TextButton onClick={menu.markAllRead}>Mark all read</TextButton>
  }

  return (
    <Popover.Root open={menu.open} onOpenChange={menu.setOpen}>
      <Tooltip label={menu.unreadLabel}>
        <Popover.Trigger render={<IconButton />} aria-label={`Notifications, ${menu.unreadLabel}`}>
          <Icon className={hasUnread ? 'text-accent' : undefined} />
          {hasUnread && <span className={'text-xs tabular-nums'}>{menu.unreadCount}</span>}
        </Popover.Trigger>
      </Tooltip>
      <PopoverSurface align={'end'} className={'w-[26rem]'}>
        {menu.openedSessionId ? (
          <NotificationSession sessionId={menu.openedSessionId} onBack={menu.closeSession} />
        ) : (
          <>
            <NotificationsHeader meta={menu.unreadLabel} action={markAll} />
            <NotificationList
              state={menu.state}
              notifications={menu.list}
              onOpen={menu.openNotification}
            />
          </>
        )}
      </PopoverSurface>
    </Popover.Root>
  )
}
