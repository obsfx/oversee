import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { InMemoryCommentGateway } from '@/src/lib/in-memory-comment-gateway.ts'
import type {
  ReviewSession,
  ReviewSessionGateway,
  SnapshotLine,
} from '@/src/lib/review-session-gateway.ts'

type SnapshotResolver = (comment: ReviewComment) => SnapshotLine[]

export class InMemoryReviewSessionGateway implements ReviewSessionGateway {
  private sessions: ReviewSession[]
  private readonly comments: InMemoryCommentGateway
  private readonly snapshotOf: SnapshotResolver
  private sequence = 0

  constructor(
    comments: InMemoryCommentGateway,
    sessions: ReviewSession[] = [],
    snapshotOf: SnapshotResolver = () => {
      return []
    },
  ) {
    this.comments = comments
    this.sessions = [...sessions]
    this.snapshotOf = snapshotOf
  }

  list() {
    return Promise.resolve([...this.sessions])
  }

  get(id: string) {
    const session = this.sessions.find((candidate) => {
      return candidate.id === id
    })
    if (!session) {
      return Promise.reject(new Error(`review session ${id} not found`))
    }
    return Promise.resolve(session)
  }

  finish(comparison: Comparison) {
    const taken = this.comments.takeAll()
    if (taken.length === 0) {
      return Promise.reject(new Error('no open review session'))
    }
    this.sequence += 1
    const now = Date.now()
    const session: ReviewSession = {
      id: `memory-session-${this.sequence}`,
      comparison,
      status: 'created',
      createdAt: Math.min(
        ...taken.map((comment) => {
          return comment.createdAt
        }),
      ),
      finishedAt: now,
      comments: taken.map((comment) => {
        return { ...comment, lines: this.snapshotOf(comment), replies: [] }
      }),
    }
    this.sessions = [session, ...this.sessions]
    return Promise.resolve(session)
  }
}
