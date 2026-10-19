import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'

export abstract class NotificationLists {
  static isUnread(notification: ReviewNotification) {
    return notification.readAt === null
  }

  static unread(notifications: readonly ReviewNotification[]) {
    return notifications.filter(NotificationLists.isUnread)
  }

  static markRead(
    notifications: readonly ReviewNotification[],
    ids: readonly number[],
    readAt: number,
  ) {
    const targets = new Set(ids)
    return notifications.map((notification) => {
      if (!NotificationLists.isUnread(notification) || !targets.has(notification.id)) {
        return notification
      }
      return { ...notification, readAt }
    })
  }
}
