import type { NotificationGateway, ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { NotificationLists } from '@/src/lib/notification-lists.ts'

export class InMemoryNotificationGateway implements NotificationGateway {
  private notifications: ReviewNotification[]

  constructor(notifications: ReviewNotification[] = []) {
    this.notifications = [...notifications]
  }

  list() {
    return Promise.resolve([...this.notifications])
  }

  markRead(ids: number[]) {
    this.notifications = NotificationLists.markRead(this.notifications, ids, Date.now())
    return Promise.resolve()
  }
}
