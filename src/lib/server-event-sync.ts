import type { Notifications } from '@/src/lib/notifications.ts'
import type { ReviewComments } from '@/src/lib/review-comments.ts'
import type { ReviewSessions } from '@/src/lib/review-sessions.ts'
import type { EventStream, ServerEvent } from '@/src/lib/server-events.ts'

export class ServerEventSync {
  private readonly events: EventStream
  private readonly sessions: ReviewSessions
  private readonly comments: ReviewComments
  private readonly notifications: Notifications

  constructor(
    events: EventStream,
    sessions: ReviewSessions,
    comments: ReviewComments,
    notifications: Notifications,
  ) {
    this.events = events
    this.sessions = sessions
    this.comments = comments
    this.notifications = notifications
  }

  start() {
    return this.events.subscribe((event) => {
      this.apply(event)
    })
  }

  private apply(event: ServerEvent) {
    if (event.kind === 'notification.created') {
      this.notifications.receive(event.notification)
      return
    }
    if (event.kind === 'notifications.read') {
      this.notifications.applyRead(event.ids, event.readAt)
      return
    }
    if (event.kind === 'session.finished') {
      this.comments.clear(event.comparison)
    }
    void this.sessions.refresh(event.comparison, event.sessionId)
  }
}
