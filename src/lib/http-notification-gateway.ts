import { ApiClient, ApiError } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import {
  NotificationShapes,
  type NotificationGateway,
  type ReviewNotification,
} from '@/src/lib/notification-gateway.ts'

export class HttpNotificationGateway extends HttpGateway implements NotificationGateway {
  private static readonly path = '/api/notifications'
  private static readonly readPath = '/api/notifications/read'

  private static parseList(body: unknown): ReviewNotification[] {
    const { notifications } = ApiClient.fieldsOf(body)
    if (!Array.isArray(notifications)) {
      throw ApiError.unexpectedShape(HttpNotificationGateway.path)
    }
    const parsed: ReviewNotification[] = []
    for (const value of notifications) {
      const notification = NotificationShapes.parse(value)
      if (notification) {
        parsed.push(notification)
      }
    }
    return parsed
  }

  list() {
    return this.api.get(HttpNotificationGateway.path, HttpNotificationGateway.parseList)
  }

  markRead(ids: number[]) {
    return this.api.sendWithoutContent('POST', HttpNotificationGateway.readPath, { ids })
  }
}
