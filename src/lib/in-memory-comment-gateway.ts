import type { CommentGateway, ReviewComment } from './comment-gateway.ts'

export class InMemoryCommentGateway implements CommentGateway {
  private readonly comments: ReviewComment[]

  constructor(comments: ReviewComment[] = []) {
    this.comments = comments
  }

  list() {
    return Promise.resolve([...this.comments])
  }
}
