import { ReviewedMarkRules, type ReviewedMarks } from '@/src/lib/reviewed-marks.ts'
import type { ReviewedMarksGateway } from '@/src/lib/reviewed-marks-gateway.ts'

export class InMemoryReviewedMarksGateway implements ReviewedMarksGateway {
  private readonly stored: Map<string, ReviewedMarks>

  constructor(stored: Record<string, ReviewedMarks> = {}) {
    this.stored = new Map(Object.entries(stored))
  }

  load(workspace: string) {
    return this.stored.get(workspace) ?? ReviewedMarkRules.empty
  }

  save(workspace: string, marks: ReviewedMarks) {
    this.stored.set(workspace, marks)
  }

  subscribe() {
    return () => {
      return
    }
  }
}
