import * as v from 'valibot'
import { ApiError } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import {
  type CommentGateway,
  type NewComment,
  StaleCommentError,
} from '@/src/lib/comment-gateway.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { CommentShapes } from '@/src/lib/comment-shapes.ts'

export class HttpCommentGateway extends HttpGateway implements CommentGateway {
  private static readonly path = '/api/comments'
  private static readonly conflictStatus = 409

  private static readonly listBody = v.object({ comments: v.array(CommentShapes.comment) })
  private static readonly oneBody = v.object({ comment: CommentShapes.comment })

  private static commentPath(id: string) {
    return HttpGateway.resourcePath(HttpCommentGateway.path, id)
  }

  async list(comparison: Comparison) {
    const { comments } = await this.api.get(
      HttpGateway.comparisonPath(HttpCommentGateway.path, comparison),
      HttpCommentGateway.listBody,
    )
    return comments
  }

  async create(comparison: Comparison, comment: NewComment) {
    try {
      const { comment: created } = await this.api.send(
        'POST',
        HttpCommentGateway.path,
        { ...ComparisonRules.query(comparison), ...comment },
        HttpCommentGateway.oneBody,
      )
      return created
    } catch (error) {
      if (error instanceof ApiError && error.status === HttpCommentGateway.conflictStatus) {
        throw new StaleCommentError()
      }
      throw error
    }
  }

  async update(id: string, body: string) {
    const { comment } = await this.api.send(
      'PATCH',
      HttpCommentGateway.commentPath(id),
      { body },
      HttpCommentGateway.oneBody,
    )
    return comment
  }

  remove(id: string) {
    return this.api.delete(HttpCommentGateway.commentPath(id))
  }
}
