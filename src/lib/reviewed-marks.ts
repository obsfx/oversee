import type { FileChange } from '@/src/lib/change-set.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'

export type ReviewedMarks = Record<string, Record<string, string>>

export interface ReviewScope {
  key: string
  revisions: ReadonlyMap<string, string>
}

export interface ReviewedView {
  marks: ReviewedMarks
  scope: ReviewScope | null
  reviewed: ReadonlySet<string>
}

export abstract class ReviewedMarkRules {
  static readonly empty: ReviewedMarks = {}
  static readonly none: ReadonlySet<string> = new Set()

  static scopeOf(comparison: Comparison, changes: readonly FileChange[]): ReviewScope {
    return {
      key: ComparisonRules.key(comparison),
      revisions: new Map(
        changes.map((change) => {
          return [change.path, change.revision]
        }),
      ),
    }
  }

  static view(
    marks: ReviewedMarks,
    scope: ReviewScope | null,
    previous: ReadonlySet<string>,
  ): ReviewedView {
    const reviewed = new Set(
      ReviewedMarkRules.validEntries(marks, scope).map(([path]) => {
        return path
      }),
    )
    if (ReviewedMarkRules.samePaths(reviewed, previous)) {
      return { marks, scope, reviewed: previous }
    }
    return { marks, scope, reviewed }
  }

  static prune(marks: ReviewedMarks, scope: ReviewScope | null) {
    if (!scope || !marks[scope.key]) {
      return marks
    }
    const valid = ReviewedMarkRules.validEntries(marks, scope)
    if (valid.length === Object.keys(marks[scope.key]).length) {
      return marks
    }
    return ReviewedMarkRules.withScope(marks, scope.key, Object.fromEntries(valid))
  }

  static toggle(marks: ReviewedMarks, scope: ReviewScope | null, path: string) {
    const revision = scope?.revisions.get(path)
    if (!scope || revision === undefined) {
      return marks
    }
    const entries = Object.entries(marks[scope.key] ?? {}).filter(([marked]) => {
      return marked !== path
    })
    if (marks[scope.key]?.[path] !== revision) {
      entries.push([path, revision])
    }
    return ReviewedMarkRules.withScope(marks, scope.key, Object.fromEntries(entries))
  }

  static clear(marks: ReviewedMarks, scope: ReviewScope | null) {
    if (!scope || !marks[scope.key]) {
      return marks
    }
    return ReviewedMarkRules.withScope(marks, scope.key, {})
  }

  private static validEntries(marks: ReviewedMarks, scope: ReviewScope | null) {
    if (!scope) {
      return []
    }
    return Object.entries(marks[scope.key] ?? {}).filter(([path, revision]) => {
      return scope.revisions.get(path) === revision
    })
  }

  private static samePaths(next: ReadonlySet<string>, previous: ReadonlySet<string>) {
    if (next.size !== previous.size) {
      return false
    }
    return [...next].every((path) => {
      return previous.has(path)
    })
  }

  private static withScope(marks: ReviewedMarks, key: string, entries: Record<string, string>) {
    const others = Object.entries(marks).filter(([scopeKey]) => {
      return scopeKey !== key
    })
    if (Object.keys(entries).length > 0) {
      others.push([key, entries])
    }
    return Object.fromEntries(others)
  }
}
