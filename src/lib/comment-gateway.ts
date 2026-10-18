import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { LineRange } from '@/src/lib/line-range.ts'

export interface ReviewComment {
  id: string
  filePath: string
  range: LineRange
  body: string
  createdAt: number
  updatedAt: number
}

export interface NewComment {
  filePath: string
  range: LineRange
  body: string
}

export interface CommentGateway {
  list(comparison: Comparison): Promise<ReviewComment[]>
  create(comparison: Comparison, comment: NewComment): Promise<ReviewComment>
  update(id: string, body: string): Promise<ReviewComment>
  remove(id: string): Promise<void>
}
