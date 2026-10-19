import type { Notifications } from '@/src/lib/notifications.ts'
import type { ReviewComments } from '@/src/lib/review-comments.ts'
import type { ReviewSessions } from '@/src/lib/review-sessions.ts'
import type { EventStream, ServerEvent, WorkspaceChange } from '@/src/lib/server-events.ts'
import { WorkspaceRefresh } from '@/src/lib/workspace-refresh.ts'

export type WorkspaceChangeListener = (change: WorkspaceChange) => void

export class ServerEventSync {
  private readonly events: EventStream
  private readonly sessions: ReviewSessions
  private readonly comments: ReviewComments
  private readonly notifications: Notifications
  private readonly workspace: WorkspaceRefresh

  constructor(
    events: EventStream,
    sessions: ReviewSessions,
    comments: ReviewComments,
    notifications: Notifications,
    workspace: WorkspaceRefresh,
  ) {
    this.events = events
    this.sessions = sessions
    this.comments = comments
    this.notifications = notifications
    this.workspace = workspace
  }

  start(onWorkspaceChange: WorkspaceChangeListener) {
    return this.events.subscribe((event) => {
      this.apply(event, onWorkspaceChange)
    })
  }

  private apply(event: ServerEvent, onWorkspaceChange: WorkspaceChangeListener) {
    if (event.kind === 'workspace.changed') {
      this.workspace.apply(event)
      onWorkspaceChange(event)
      return
    }
    if (event.kind === 'stream.resumed') {
      this.workspace.apply(WorkspaceRefresh.everything)
      return
    }
    if (event.kind === 'comments.reconciled') {
      this.comments.invalidate(event.comparison)
      return
    }
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
