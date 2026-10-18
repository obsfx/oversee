import type { ReviewComment } from '@/src/lib/comment-gateway.ts'

export abstract class CommentLists {
  static replace(comments: readonly ReviewComment[], updated: ReviewComment) {
    return comments.map((comment) => {
      return comment.id === updated.id ? updated : comment
    })
  }

  static without(comments: readonly ReviewComment[], id: string) {
    return comments.filter((comment) => {
      return comment.id !== id
    })
  }
}
