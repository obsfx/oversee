import { ApiClient } from '@/src/lib/api-client.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { NotificationShapes, type ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { SessionStatuses, type SessionStatus } from '@/src/lib/session-statuses.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export interface EventEnvelope {
  id: number
  kind: string
  payload: unknown
  createdAt: number
}

export interface SessionChangedEvent {
  kind: 'session.finished' | 'session.status'
  sessionId: string
  comparison: Comparison
  status: SessionStatus
}

export interface CommentRepliedEvent {
  kind: 'comment.replied'
  sessionId: string
  comparison: Comparison
}

export interface NotificationCreatedEvent {
  kind: 'notification.created'
  notification: ReviewNotification
}

export interface NotificationsReadEvent {
  kind: 'notifications.read'
  ids: number[]
  readAt: number
}

export type ServerEvent =
  SessionChangedEvent | CommentRepliedEvent | NotificationCreatedEvent | NotificationsReadEvent

export type ServerEventListener = (event: ServerEvent) => void

export interface EventStream {
  subscribe(listener: ServerEventListener): () => void
}

const SESSION_KINDS = ['session.finished', 'session.status'] as const

export abstract class ServerEvents {
  static parseEnvelope(raw: string): EventEnvelope | null {
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
    const { id, kind, payload, createdAt } = ApiClient.fieldsOf(value)
    if (
      !ValueGuards.isCount(id) ||
      !ValueGuards.isString(kind) ||
      !ValueGuards.isNumber(createdAt)
    ) {
      return null
    }
    return { id, kind, payload, createdAt }
  }

  static fromEnvelope(envelope: EventEnvelope): ServerEvent | null {
    if (envelope.kind === 'notification.created') {
      return ServerEvents.notificationCreated(envelope.payload)
    }
    if (envelope.kind === 'notifications.read') {
      return ServerEvents.notificationsRead(envelope)
    }
    return ServerEvents.reviewEvent(envelope)
  }

  private static notificationCreated(payload: unknown): NotificationCreatedEvent | null {
    const notification = NotificationShapes.parse(ApiClient.fieldsOf(payload).notification)
    if (!notification) {
      return null
    }
    return { kind: 'notification.created', notification }
  }

  private static notificationsRead({
    payload,
    createdAt,
  }: EventEnvelope): NotificationsReadEvent | null {
    const { ids } = ApiClient.fieldsOf(payload)
    if (!ValueGuards.isListOf(ids, ValueGuards.isCount)) {
      return null
    }
    return { kind: 'notifications.read', ids, readAt: createdAt }
  }

  private static reviewEvent({ kind, payload }: EventEnvelope): ServerEvent | null {
    const { sessionId, comparison, status } = ApiClient.fieldsOf(payload)
    const parsedComparison = ServerEvents.parseComparison(comparison)
    if (!ValueGuards.isString(sessionId) || !parsedComparison) {
      return null
    }
    if (ValueGuards.isOneOf(SESSION_KINDS, kind) && SessionStatuses.isStatus(status)) {
      return { kind, sessionId, comparison: parsedComparison, status }
    }
    if (kind === 'comment.replied') {
      return { kind, sessionId, comparison: parsedComparison }
    }
    return null
  }

  private static parseComparison(value: unknown): Comparison | null {
    const { source, target } = ApiClient.fieldsOf(value)
    if (!ValueGuards.isString(source) || !ValueGuards.isString(target)) {
      return null
    }
    return ComparisonRules.fromQuery(source, target)
  }
}
