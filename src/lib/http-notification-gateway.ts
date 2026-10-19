import * as v from 'valibot'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import { NotificationShapes, type NotificationGateway } from '@/src/lib/notification-gateway.ts'

export class HttpNotificationGateway extends HttpGateway implements NotificationGateway {
  private static readonly path = '/api/notifications'
  private static readonly readPath = '/api/notifications/read'

  private static readonly body = v.object({ notifications: v.array(v.unknown()) })

  async list() {
    const { notifications } = await this.api.get(
      HttpNotificationGateway.path,
      HttpNotificationGateway.body,
    )
    return notifications.map(NotificationShapes.parse).filter((notification) => {
      return notification !== null
    })
  }

  markRead(ids: number[]) {
    return this.api.sendWithoutContent('POST', HttpNotificationGateway.readPath, { ids })
  }
}
