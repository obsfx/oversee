export interface CommentFocusRequest {
  commentId: string
  requestedAt: number
}

export abstract class CommentFocusRequests {
  static request(commentId: string): CommentFocusRequest {
    return { commentId, requestedAt: Date.now() }
  }

  static requestedAt(focus: CommentFocusRequest | null, commentId: string) {
    if (focus?.commentId !== commentId) {
      return null
    }
    return focus.requestedAt
  }

  static cleared<T extends CommentFocusRequest>(focus: T | null, requestedAt: number) {
    if (focus?.requestedAt === requestedAt) {
      return null
    }
    return focus
  }
}
