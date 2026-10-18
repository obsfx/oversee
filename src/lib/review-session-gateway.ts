import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { SessionStatus } from '@/src/lib/session-statuses.ts'

export interface SnapshotLine {
  number: number
  text: string
}

export interface CommentReply {
  id: string
  commentId: string
  author: string
  body: string
  createdAt: number
}

export interface SessionComment extends ReviewComment {
  lines: SnapshotLine[]
  replies: CommentReply[]
}

export interface ReviewSession {
  id: string
  comparison: Comparison
  status: SessionStatus
  createdAt: number
  finishedAt: number
  comments: SessionComment[]
}

export interface ReviewSessionGateway {
  list(comparison: Comparison): Promise<ReviewSession[]>
  get(id: string): Promise<ReviewSession>
  finish(comparison: Comparison): Promise<ReviewSession>
}
