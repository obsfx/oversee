import { ApiClient, ApiError } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type { CommentGateway, NewComment, ReviewComment } from '@/src/lib/comment-gateway.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { LineRanges, type LineRange } from '@/src/lib/line-range.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export class HttpCommentGateway extends HttpGateway implements CommentGateway {
  private static readonly path = '/comments'

  private static isLineRange(value: unknown): value is LineRange {
    const { start, end, side, endSide } = ApiClient.fieldsOf(value)
    return (
      ValueGuards.isPositiveInteger(start) &&
      ValueGuards.isPositiveInteger(end) &&
      LineRanges.isSide(side) &&
      LineRanges.isSide(endSide)
    )
  }

  private static isReviewComment(value: unknown): value is ReviewComment {
    const { id, filePath, range, body, createdAt, updatedAt } = ApiClient.fieldsOf(value)
    return (
      ValueGuards.isString(id) &&
      ValueGuards.isString(filePath) &&
      HttpCommentGateway.isLineRange(range) &&
      ValueGuards.isString(body) &&
      ValueGuards.isNumber(createdAt) &&
      ValueGuards.isNumber(updatedAt)
    )
  }

  private static toComment({
    id,
    filePath,
    range,
    body,
    createdAt,
    updatedAt,
  }: ReviewComment): ReviewComment {
    const { start, end, side, endSide } = range
    return { id, filePath, range: { start, end, side, endSide }, body, createdAt, updatedAt }
  }

  private static parseList(body: unknown): ReviewComment[] {
    const { comments } = ApiClient.fieldsOf(body)
    if (!ValueGuards.isListOf(comments, HttpCommentGateway.isReviewComment)) {
      throw ApiError.unexpectedShape(HttpCommentGateway.path)
    }
    return comments.map(HttpCommentGateway.toComment)
  }

  private static parseOne(body: unknown): ReviewComment {
    const { comment } = ApiClient.fieldsOf(body)
    if (!HttpCommentGateway.isReviewComment(comment)) {
      throw ApiError.unexpectedShape(HttpCommentGateway.path)
    }
    return HttpCommentGateway.toComment(comment)
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
