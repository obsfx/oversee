import * as v from 'valibot'
import { ReviewedMarkRules, type ReviewedMarks } from '@/src/lib/reviewed-marks.ts'
import type { ReviewedMarksGateway } from '@/src/lib/reviewed-marks-gateway.ts'

export class LocalReviewedMarksGateway implements ReviewedMarksGateway {
  private static readonly prefix = 'oversee.reviewed:'

  private static readonly schema = v.record(v.string(), v.record(v.string(), v.string()))

  private readonly storage: () => Storage

  constructor(storage: () => Storage) {
    this.storage = storage
  }

  load(workspace: string) {
    try {
      return LocalReviewedMarksGateway.parse(
        this.storage().getItem(LocalReviewedMarksGateway.keyOf(workspace)),
      )
    } catch {
      return ReviewedMarkRules.empty
    }
  }

  save(workspace: string, marks: ReviewedMarks) {
    try {
      this.storage().setItem(LocalReviewedMarksGateway.keyOf(workspace), JSON.stringify(marks))
    } catch {
      return
    }
  }

  subscribe(workspace: string, listener: (marks: ReviewedMarks) => void) {
    const key = LocalReviewedMarksGateway.keyOf(workspace)
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        listener(LocalReviewedMarksGateway.parse(event.newValue))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }

  private static keyOf(workspace: string) {
    return `${LocalReviewedMarksGateway.prefix}${workspace}`
  }

  private static parse(raw: string | null): ReviewedMarks {
    if (raw === null) {
      return ReviewedMarkRules.empty
    }
    try {
      const result = v.safeParse(LocalReviewedMarksGateway.schema, JSON.parse(raw))
      return result.success ? result.output : ReviewedMarkRules.empty
    } catch {
      return ReviewedMarkRules.empty
    }
  }
}
