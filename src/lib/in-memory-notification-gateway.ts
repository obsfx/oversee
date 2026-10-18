import type { NotificationGateway, ReviewNotification } from '@/src/lib/notification-gateway.ts'

export class InMemoryNotificationGateway implements NotificationGateway {
  private notifications: ReviewNotification[]

  constructor(notifications: ReviewNotification[] = []) {
    this.notifications = [...notifications]
  }

  list() {
    return Promise.resolve([...this.notifications])
  }

  markRead(ids: number[]) {
    const targets = new Set(ids)
    const readAt = Date.now()
    this.notifications = this.notifications.map((notification) => {
      if (notification.readAt !== null || !targets.has(notification.id)) {
        return notification
      }
      return { ...notification, readAt }
    })
    return Promise.resolve()
  }
}
