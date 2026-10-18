import { ApiClient } from '@/src/lib/api-client.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { SessionStatuses, type SessionStatus } from '@/src/lib/session-statuses.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

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
  static parse(value: unknown): ReviewNotification | null {
    const {
      id,
      kind,
      sessionId,
      source,
      target,
      status,
      commentId,
      filePath,
      line,
      createdAt,
      readAt,
    } = ApiClient.fieldsOf(value)
    const valid =
      ValueGuards.isCount(id) &&
      ValueGuards.isString(sessionId) &&
      ValueGuards.isString(source) &&
      ValueGuards.isString(target) &&
      ValueGuards.isNumber(createdAt)
    if (!valid) {
      return null
    }
    const base = {
      id,
      sessionId,
      comparison: ComparisonRules.fromQuery(source, target),
      createdAt,
      readAt: ValueGuards.isNumber(readAt) ? readAt : null,
    }
    if (kind === 'session-status' && SessionStatuses.isStatus(status)) {
      return { ...base, kind, status }
    }
    const isReply =
      kind === 'comment-reply' &&
      ValueGuards.isString(commentId) &&
      ValueGuards.isString(filePath) &&
      ValueGuards.isPositiveInteger(line)
    if (isReply) {
      return { ...base, kind, commentId, filePath, line }
    }
    return null
  }
}
