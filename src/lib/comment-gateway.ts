import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { LineRange } from '@/src/lib/line-range.ts'

export interface SnapshotLine {
  number: number
  text: string
}

export interface ReviewComment {
  id: string
  filePath: string
  range: LineRange
  body: string
  lines: SnapshotLine[]
  createdAt: number
  updatedAt: number
  outdatedAt: number | null
}

export interface NewComment {
  filePath: string
  previousPath?: string
  range: LineRange
  body: string
  expectedLines?: string[]
}

export class StaleCommentError extends Error {
  constructor() {
    super('The commented lines changed after they were loaded')
    this.name = 'StaleCommentError'
  }
}

export interface CommentGateway {
  list(comparison: Comparison): Promise<ReviewComment[]>
  create(comparison: Comparison, comment: NewComment): Promise<ReviewComment>
  update(id: string, body: string): Promise<ReviewComment>
  remove(id: string): Promise<void>
}
