import { Ratio } from './ratio.ts'

export interface ReviewProgress {
  reviewed: number
  total: number
  percent: number
}

export abstract class ReviewProgressRules {
  static of(paths: readonly string[], reviewed: ReadonlySet<string>): ReviewProgress {
    const reviewedCount = paths.filter((path) => {
      return reviewed.has(path)
    }).length
    return {
      reviewed: reviewedCount,
      total: paths.length,
      percent: Ratio.percent(reviewedCount, paths.length),
    }
  }
}
