import * as v from 'valibot'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { SessionStatuses, type SessionStatus } from '@/src/lib/session-statuses.ts'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

interface NotificationBase {
  id: number
  sessionId: string
  comparison: Comparison
  createdAt: number
  readAt: number | null
}

export interface SessionStatusNotification extends NotificationBase {
  kind: 'session-status'
  status: SessionStatus
}

export interface CommentReplyNotification extends NotificationBase {
  kind: 'comment-reply'
  commentId: string
  filePath: string
  line: number
}

export type ReviewNotification = SessionStatusNotification | CommentReplyNotification

export interface NotificationGateway {
  list(): Promise<ReviewNotification[]>
  markRead(ids: number[]): Promise<void>
}

export abstract class NotificationShapes {
  private static readonly base = {
    id: ValueSchemas.count,
    sessionId: v.string(),
    source: v.string(),
    target: v.string(),
    createdAt: v.number(),
    readAt: v.fallback(v.nullable(v.number()), null),
  }

  private static readonly schema = v.pipe(
    v.variant('kind', [
      v.object({
        ...NotificationShapes.base,
        kind: v.literal('session-status'),
        status: SessionStatuses.schema,
      }),
      v.object({
        ...NotificationShapes.base,
        kind: v.literal('comment-reply'),
        commentId: v.string(),
        filePath: v.string(),
        line: ValueSchemas.positiveInteger,
      }),
    ]),
    v.transform(({ source, target, ...notification }): ReviewNotification => {
      return { ...notification, comparison: ComparisonRules.fromQuery(source, target) }
    }),
  )

  static parse(value: unknown): ReviewNotification | null {
    const result = v.safeParse(NotificationShapes.schema, value)
    return result.success ? result.output : null
  }
}
