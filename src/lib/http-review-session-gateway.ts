import { ApiClient } from '@/src/lib/api-client.ts'
import { CommentShapes } from '@/src/lib/comment-shapes.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type {
  ReviewSession,
  ReviewSessionGateway,
  SessionComment,
  SnapshotLine,
} from '@/src/lib/review-session-gateway.ts'
import { SessionStatuses } from '@/src/lib/session-statuses.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export class HttpReviewSessionGateway extends HttpGateway implements ReviewSessionGateway {
  private static readonly path = '/review-sessions'
  private static readonly finishPath = '/review-sessions/finish'

  private static isSnapshotLine(value: unknown): value is SnapshotLine {
    const { number, text } = ApiClient.fieldsOf(value)
    return ValueGuards.isPositiveInteger(number) && ValueGuards.isString(text)
  }

  private static isSessionComment(value: unknown): value is SessionComment {
    const { lines } = ApiClient.fieldsOf(value)
    return (
      CommentShapes.isReviewComment(value) &&
      ValueGuards.isListOf(lines, HttpReviewSessionGateway.isSnapshotLine)
    )
  }

  private static isReviewSession(value: unknown): value is ReviewSession {
    const { id, status, createdAt, finishedAt, comments } = ApiClient.fieldsOf(value)
    return (
      ValueGuards.isString(id) &&
      SessionStatuses.isStatus(status) &&
      ValueGuards.isNumber(createdAt) &&
      ValueGuards.isNumber(finishedAt) &&
      ValueGuards.isListOf(comments, HttpReviewSessionGateway.isSessionComment)
    )
  }

  private static toSession({ id, status, createdAt, finishedAt, comments }: ReviewSession) {
    return {
      id,
      status,
      createdAt,
      finishedAt,
      comments: comments.map((comment) => {
        const lines = comment.lines.map(({ number, text }) => {
          return { number, text }
        })
        return { ...CommentShapes.toComment(comment), lines }
      }),
    }
  }

  private static isSessionList(value: unknown): value is ReviewSession[] {
    return ValueGuards.isListOf(value, HttpReviewSessionGateway.isReviewSession)
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
        HttpReviewSessionGateway.isReviewSession,
        HttpReviewSessionGateway.finishPath,
      ),
    )
  }

  list(comparison: Comparison) {
    return this.api.get(
      ApiClient.withQuery(HttpReviewSessionGateway.path, ComparisonRules.searchParams(comparison)),
      HttpReviewSessionGateway.parseList,
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
