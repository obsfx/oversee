import * as v from 'valibot'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { NotificationShapes, type ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { SessionStatuses, type SessionStatus } from '@/src/lib/session-statuses.ts'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

export interface EventEnvelope {
  id: number | null
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

export interface CommentsReconciledEvent {
  kind: 'comments.reconciled'
  sessionId: string
  comparison: Comparison
}

export interface WorkspaceChange {
  paths: string[]
  refs: boolean
}

export interface WorkspaceChangedEvent extends WorkspaceChange {
  kind: 'workspace.changed'
}

export interface StreamResumedEvent {
  kind: 'stream.resumed'
}

export interface LanguageServersChangedEvent {
  kind: 'language-servers.changed'
}

export type ServerEvent =
  | SessionChangedEvent
  | CommentRepliedEvent
  | NotificationCreatedEvent
  | NotificationsReadEvent
  | CommentsReconciledEvent
  | WorkspaceChangedEvent
  | StreamResumedEvent
  | LanguageServersChangedEvent

export type ServerEventListener = (event: ServerEvent) => void

export interface EventStream {
  subscribe(listener: ServerEventListener): () => void
}

const SESSION_KINDS = ['session.finished', 'session.status'] as const
const COMMENT_KINDS = ['comment.replied', 'comments.reconciled'] as const

export abstract class ServerEvents {
  private static readonly envelope = v.object({
    id: v.optional(ValueSchemas.count),
    kind: v.string(),
    payload: v.optional(v.unknown()),
    createdAt: v.number(),
  })

  private static readonly events = v.variant('kind', [
    v.object({
      kind: v.literal('notification.created'),
      payload: v.object({ notification: v.unknown() }),
    }),
    v.object({
      kind: v.literal('notifications.read'),
      payload: v.object({ ids: v.array(ValueSchemas.count) }),
      createdAt: v.number(),
    }),
    v.object({
      kind: v.literal('workspace.changed'),
      payload: v.object({ paths: v.array(v.string()), refs: v.boolean() }),
    }),
    v.object({
      kind: v.literal('language-servers.changed'),
    }),
    v.object({
      kind: v.picklist(SESSION_KINDS),
      payload: v.object({
        sessionId: v.string(),
        comparison: ComparisonRules.wireSchema,
        status: SessionStatuses.schema,
      }),
    }),
    v.object({
      kind: v.picklist(COMMENT_KINDS),
      payload: v.object({ sessionId: v.string(), comparison: ComparisonRules.wireSchema }),
    }),
  ])

  static parseEnvelope(raw: string): EventEnvelope | null {
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
    const result = v.safeParse(ServerEvents.envelope, value)
    if (!result.success) {
      return null
    }
    const { id, kind, payload, createdAt } = result.output
    return { id: id ?? null, kind, payload, createdAt }
  }

  static fromEnvelope(envelope: EventEnvelope): ServerEvent | null {
    const result = v.safeParse(ServerEvents.events, envelope)
    if (!result.success) {
      return null
    }
    return ServerEvents.toEvent(result.output)
  }

  private static toEvent(event: v.InferOutput<typeof ServerEvents.events>): ServerEvent | null {
    if (event.kind === 'notification.created') {
      const notification = NotificationShapes.parse(event.payload.notification)
      if (!notification) {
        return null
      }
      return { kind: event.kind, notification }
    }
    if (event.kind === 'notifications.read') {
      return { kind: event.kind, ids: event.payload.ids, readAt: event.createdAt }
    }
    if (event.kind === 'workspace.changed') {
      return { kind: event.kind, ...event.payload }
    }
    if (event.kind === 'language-servers.changed') {
      return { kind: event.kind }
    }
    if (event.kind === 'session.finished' || event.kind === 'session.status') {
      return { kind: event.kind, ...event.payload }
    }
    return { kind: event.kind, ...event.payload }
  }
}
