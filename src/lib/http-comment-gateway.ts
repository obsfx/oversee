import { ApiClient } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type { CommentGateway, NewComment, ReviewComment } from '@/src/lib/comment-gateway.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { CommentShapes } from '@/src/lib/comment-shapes.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export class HttpCommentGateway extends HttpGateway implements CommentGateway {
  private static readonly path = '/comments'

  private static isCommentList(value: unknown): value is ReviewComment[] {
    return ValueGuards.isListOf(value, CommentShapes.isReviewComment)
  }

  private static parseList(body: unknown): ReviewComment[] {
    return ApiClient.field(
      body,
      'comments',
      HttpCommentGateway.isCommentList,
      HttpCommentGateway.path,
    ).map(CommentShapes.toComment)
  }

  private static parseOne(body: unknown): ReviewComment {
    return CommentShapes.toComment(
      ApiClient.field(body, 'comment', CommentShapes.isReviewComment, HttpCommentGateway.path),
    )
  }

  private static commentPath(id: string) {
    return `${HttpCommentGateway.path}/${encodeURIComponent(id)}`
  }

  list(comparison: Comparison) {
    return this.api.get(
      ApiClient.withQuery(HttpCommentGateway.path, ComparisonRules.searchParams(comparison)),
      HttpCommentGateway.parseList,
    )
  }

  create(comparison: Comparison, comment: NewComment) {
    return this.api.send(
      'POST',
      HttpCommentGateway.path,
      { ...ComparisonRules.query(comparison), ...comment },
      HttpCommentGateway.parseOne,
    )
  }

  update(id: string, body: string) {
    return this.api.send(
      'PATCH',
      HttpCommentGateway.commentPath(id),
      { body },
      HttpCommentGateway.parseOne,
    )
  }

  remove(id: string) {
    return this.api.delete(HttpCommentGateway.commentPath(id))
  }
}
