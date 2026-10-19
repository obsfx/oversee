import type { ReviewedMarks } from '@/src/lib/reviewed-marks.ts'

export interface ReviewedMarksGateway {
  load(workspace: string): ReviewedMarks
  save(workspace: string, marks: ReviewedMarks): void
  subscribe(workspace: string, listener: (marks: ReviewedMarks) => void): () => void
}
