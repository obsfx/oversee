import * as v from 'valibot'
import { CommentShapes } from '@/src/lib/comment-shapes.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type {
  ReviewSession,
  ReviewSessionGateway,
  SessionComment,
} from '@/src/lib/review-session-gateway.ts'
import { SessionStatuses } from '@/src/lib/session-statuses.ts'

export class HttpReviewSessionGateway extends HttpGateway implements ReviewSessionGateway {
  private static readonly path = '/api/review-sessions'
  private static readonly finishPath = '/api/review-sessions/finish'

  private static readonly reply = v.object({
    id: v.string(),
    commentId: v.string(),
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
  })

  private static readonly sessionComment = v.pipe(
    v.object({ ...CommentShapes.wire.entries, replies: v.array(HttpReviewSessionGateway.reply) }),
    v.transform(({ replies, ...wire }): SessionComment => {
      return { ...CommentShapes.toComment(wire), replies }
    }),
  )

  private static readonly session = v.pipe(
    v.object({
      id: v.string(),
      source: v.string(),
      target: v.string(),
      status: SessionStatuses.schema,
      createdAt: v.number(),
      finishedAt: v.number(),
      comments: v.array(HttpReviewSessionGateway.sessionComment),
    }),
    v.transform(({ source, target, ...session }): ReviewSession => {
      return { ...session, comparison: ComparisonRules.fromQuery(source, target) }
    }),
  )

  private static readonly listBody = v.object({
    sessions: v.array(HttpReviewSessionGateway.session),
  })

  private static readonly oneBody = v.object({ session: HttpReviewSessionGateway.session })

  async list(comparison: Comparison) {
    const { sessions } = await this.api.get(
      HttpGateway.comparisonPath(HttpReviewSessionGateway.path, comparison),
      HttpReviewSessionGateway.listBody,
    )
    return sessions
  }

  async get(id: string) {
    const { session } = await this.api.get(
      HttpGateway.resourcePath(HttpReviewSessionGateway.path, id),
      HttpReviewSessionGateway.oneBody,
    )
    return session
  }

  async finish(comparison: Comparison) {
    const { session } = await this.api.send(
      'POST',
      HttpReviewSessionGateway.finishPath,
      ComparisonRules.query(comparison),
      HttpReviewSessionGateway.oneBody,
    )
    return session
  }
}
