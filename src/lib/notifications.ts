import { AsyncResource } from '@/src/lib/async-resource.ts'
import type { NotificationGateway, ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { NotificationLists } from '@/src/lib/notification-lists.ts'

export class Notifications {
  readonly list: AsyncResource<ReviewNotification[]>
  private readonly gateway: NotificationGateway

  constructor(gateway: NotificationGateway) {
    this.gateway = gateway
    this.list = new AsyncResource(() => {
      return gateway.list()
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
    this.list.update((notifications) => {
      return NotificationLists.markRead(notifications, ids, readAt)
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
