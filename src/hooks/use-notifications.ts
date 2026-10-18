import { useServices } from '@/src/context/services/use-services.ts'
import { useResource } from '@/src/hooks/use-resource.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { NotificationLabels } from '@/src/lib/notification-labels.ts'
import { Notifications } from '@/src/lib/notifications.ts'

export const useNotifications = () => {
  const { notifications } = useServices()
  const state = useResource(notifications.list)
  const list = ResourceStates.dataOr(state, [])
  const unread = Notifications.unread(list)

  const markRead = (notification: ReviewNotification) => {
    void notifications.markRead([notification.id])
  }

  const markAllRead = () => {
    void notifications.markRead(
      unread.map(({ id }) => {
        return id
      }),
    )
  }

  return {
    state,
    list,
    unreadCount: unread.length,
    unreadLabel: NotificationLabels.unread(unread.length),
    markRead,
    markAllRead,
  }
}
