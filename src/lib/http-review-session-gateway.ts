import { ApiClient } from '@/src/lib/api-client.ts'
import { CommentShapes } from '@/src/lib/comment-shapes.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type {
  CommentReply,
  ReviewSession,
  ReviewSessionGateway,
  SessionComment,
  SnapshotLine,
} from '@/src/lib/review-session-gateway.ts'
import { SessionStatuses } from '@/src/lib/session-statuses.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

interface WireSession extends Omit<ReviewSession, 'comparison'> {
  source: string
  target: string
}

export class HttpReviewSessionGateway extends HttpGateway implements ReviewSessionGateway {
  private static readonly path = '/api/review-sessions'
  private static readonly finishPath = '/api/review-sessions/finish'

  private static isSnapshotLine(value: unknown): value is SnapshotLine {
    const { number, text } = ApiClient.fieldsOf(value)
    return ValueGuards.isPositiveInteger(number) && ValueGuards.isString(text)
  }

  private static isReply(value: unknown): value is CommentReply {
    const { id, commentId, author, body, createdAt } = ApiClient.fieldsOf(value)
    return (
      ValueGuards.isString(id) &&
      ValueGuards.isString(commentId) &&
      ValueGuards.isString(author) &&
      ValueGuards.isString(body) &&
      ValueGuards.isNumber(createdAt)
    )
  }

  private static isSessionComment(value: unknown): value is SessionComment {
    const { lines, replies } = ApiClient.fieldsOf(value)
    return (
      CommentShapes.isReviewComment(value) &&
      ValueGuards.isListOf(lines, HttpReviewSessionGateway.isSnapshotLine) &&
      ValueGuards.isListOf(replies, HttpReviewSessionGateway.isReply)
    )
  }

  private static isWireSession(value: unknown): value is WireSession {
    const { id, source, target, status, createdAt, finishedAt, comments } =
      ApiClient.fieldsOf(value)
    return (
      ValueGuards.isString(id) &&
      ValueGuards.isString(source) &&
      ValueGuards.isString(target) &&
      SessionStatuses.isStatus(status) &&
      ValueGuards.isNumber(createdAt) &&
      ValueGuards.isNumber(finishedAt) &&
      ValueGuards.isListOf(comments, HttpReviewSessionGateway.isSessionComment)
    )
  }

  private static toSession({
    id,
    source,
    target,
    status,
    createdAt,
    finishedAt,
    comments,
  }: WireSession): ReviewSession {
    return {
      id,
      comparison: ComparisonRules.fromQuery(source, target),
      status,
      createdAt,
      finishedAt,
      comments: comments.map((comment) => {
        const lines = comment.lines.map(({ number, text }) => {
          return { number, text }
        })
        const replies = comment.replies.map(({ id, commentId, author, body, createdAt }) => {
          return { id, commentId, author, body, createdAt }
        })
        return { ...CommentShapes.toComment(comment), lines, replies }
      }),
    }
  }

  private static isSessionList(value: unknown): value is WireSession[] {
    return ValueGuards.isListOf(value, HttpReviewSessionGateway.isWireSession)
  }

  private static parseList(body: unknown): ReviewSession[] {
    return ApiClient.field(
      body,
      'sessions',
      HttpReviewSessionGateway.isSessionList,
      HttpReviewSessionGateway.path,
    ).map(HttpReviewSessionGateway.toSession)
  }

  private static parseOne(body: unknown): ReviewSession {
    return HttpReviewSessionGateway.toSession(
      ApiClient.field(
        body,
        'session',
        HttpReviewSessionGateway.isWireSession,
        HttpReviewSessionGateway.path,
      ),
    )
  }

  list(comparison: Comparison) {
    return this.api.get(
      ApiClient.withQuery(HttpReviewSessionGateway.path, ComparisonRules.searchParams(comparison)),
      HttpReviewSessionGateway.parseList,
    )
  }

  get(id: string) {
    return this.api.get(
      `${HttpReviewSessionGateway.path}/${encodeURIComponent(id)}`,
      HttpReviewSessionGateway.parseOne,
    )
  }

  finish(comparison: Comparison) {
    return this.api.send(
      'POST',
      HttpReviewSessionGateway.finishPath,
      ComparisonRules.query(comparison),
      HttpReviewSessionGateway.parseOne,
    )
  }
}
