import { ApiClient } from '@/src/lib/api-client.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { LineRanges, type LineRange } from '@/src/lib/line-range.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export abstract class CommentShapes {
  static isReviewComment(value: unknown): value is ReviewComment {
    const { id, filePath, range, body, createdAt, updatedAt } = ApiClient.fieldsOf(value)
    return (
      ValueGuards.isString(id) &&
      ValueGuards.isString(filePath) &&
      CommentShapes.isLineRange(range) &&
      ValueGuards.isString(body) &&
      ValueGuards.isNumber(createdAt) &&
      ValueGuards.isNumber(updatedAt)
    )
  }

  static toComment({
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

  private static isLineRange(value: unknown): value is LineRange {
    const { start, end, side, endSide } = ApiClient.fieldsOf(value)
    return (
      ValueGuards.isPositiveInteger(start) &&
      ValueGuards.isPositiveInteger(end) &&
      LineRanges.isSide(side) &&
      LineRanges.isSide(endSide)
    )
  }
}
