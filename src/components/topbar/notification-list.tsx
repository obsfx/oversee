import { VscBell } from 'react-icons/vsc'
import { NotificationIcon } from '@/src/components/topbar/notification-icon.tsx'
import { useNow } from '@/src/hooks/use-now.ts'
import type { ResourceState } from '@/src/lib/async-resource.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { NotificationLabels } from '@/src/lib/notification-labels.ts'
import { NotificationLists } from '@/src/lib/notification-lists.ts'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { NotificationRow } from '@/src/primitives/notification-row.tsx'
import { PopoverEmptyState } from '@/src/primitives/popover-empty-state.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'

interface NotificationListProps {
  state: ResourceState<ReviewNotification[]>
  notifications: ReviewNotification[]
  onOpen: (notification: ReviewNotification) => void
}

export function NotificationList({ state, notifications, onOpen }: NotificationListProps) {
  const now = useNow()

  return (
    <PopoverScrollArea>
      {state.status === 'loading' && <MutedHint>Loading notifications</MutedHint>}
      {state.status === 'failed' && <MutedHint>Could not load notifications</MutedHint>}
      {state.status === 'ready' && notifications.length === 0 && (
        <PopoverEmptyState icon={<VscBell />}>
          Agent activity on your reviews shows up here.
        </PopoverEmptyState>
      )}
      {notifications.map((notification) => {
        return (
          <NotificationRow
            key={notification.id}
            leading={<NotificationIcon notification={notification} />}
            title={NotificationLabels.title(notification)}
            subtitle={NotificationLabels.comparison(notification)}
            meta={NotificationLabels.age(notification, now)}
            unread={NotificationLists.isUnread(notification)}
            onSelect={() => {
              onOpen(notification)
            }}
          />
        )
      })}
    </PopoverScrollArea>
  )
}
