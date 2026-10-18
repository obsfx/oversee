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
    const percent = paths.length === 0 ? 0 : (reviewedCount / paths.length) * 100
    return { reviewed: reviewedCount, total: paths.length, percent }
  }
}
