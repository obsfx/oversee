import { AsyncResource } from '@/src/lib/async-resource.ts'
import type { NotificationGateway, ReviewNotification } from '@/src/lib/notification-gateway.ts'

export class Notifications {
  readonly list: AsyncResource<ReviewNotification[]>
  private readonly gateway: NotificationGateway

  constructor(gateway: NotificationGateway) {
    this.gateway = gateway
    this.list = new AsyncResource(() => {
      return gateway.list()
    })
  }

  static unread(notifications: ReviewNotification[]) {
    return notifications.filter((notification) => {
      return notification.readAt === null
    })
  }

  receive(notification: ReviewNotification) {
    this.list.update((notifications) => {
      const others = notifications.filter(({ id }) => {
        return id !== notification.id
      })
      return [notification, ...others]
    })
  }

  applyRead(ids: number[], readAt: number) {
    const targets = new Set(ids)
    this.list.update((notifications) => {
      return notifications.map((notification) => {
        if (notification.readAt !== null || !targets.has(notification.id)) {
          return notification
        }
        return { ...notification, readAt }
      })
    })
  }

  async markRead(ids: number[]) {
    if (ids.length === 0) {
      return
    }
    this.applyRead(ids, Date.now())
    try {
      await this.gateway.markRead(ids)
    } catch (error) {
      await this.list.reload()
      throw error
    }
  }
}
