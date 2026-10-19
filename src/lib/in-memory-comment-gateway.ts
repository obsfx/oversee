import type { CommentGateway, NewComment, ReviewComment } from '@/src/lib/comment-gateway.ts'
import { CommentLists } from '@/src/lib/comment-lists.ts'

export class InMemoryCommentGateway implements CommentGateway {
  private comments: ReviewComment[]
  private sequence = 0

  constructor(comments: ReviewComment[] = []) {
    this.comments = [...comments]
  }

  list() {
    return Promise.resolve([...this.comments])
  }

  create(_comparison: unknown, { filePath, range, body }: NewComment) {
    const now = Date.now()
    this.sequence += 1
    const comment: ReviewComment = {
      filePath,
      range,
      body,
      id: `memory-${this.sequence}`,
      lines: [],
      createdAt: now,
      updatedAt: now,
      outdatedAt: null,
    }
    this.comments = [...this.comments, comment]
    return Promise.resolve(comment)
  }

  update(id: string, body: string) {
    const existing = this.comments.find((comment) => {
      return comment.id === id
    })
    if (!existing) {
      return Promise.reject(new Error(`comment ${id} not found`))
    }
    const updated = { ...existing, body, updatedAt: Date.now() }
    this.comments = CommentLists.replace(this.comments, updated)
    return Promise.resolve(updated)
  }

  takeAll() {
    const taken = this.comments
    this.comments = []
    return taken
  }

  remove(id: string) {
    this.comments = CommentLists.without(this.comments, id)
    return Promise.resolve()
  }
}
