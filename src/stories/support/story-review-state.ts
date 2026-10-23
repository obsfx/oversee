import type { FileChange } from '@/src/lib/change-set.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { ReviewedMarkRules } from '@/src/lib/reviewed-marks.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useReviewStore } from '@/src/store/review-store.ts'

export const STORY_PATH = 'src/graphql/resolvers/User/mutations/auth.ts'

export const resetReviewState = (selectedPath: string | null = STORY_PATH) => {
  useNavigationStore.setState({ selectedPath, focus: null })
  useAnnotationStore.setState({ selection: null, selecting: false, draft: null })
}

export const seedReviewedMarks = (
  reviewed: readonly string[] = [],
  changes: readonly FileChange[] = changeSet.changes,
) => {
  const comparison = { source: ComparisonRules.uncommitted, target: 'main' }
  useReviewStore.setState({
    marks: ReviewedMarkRules.empty,
    scope: null,
    reviewed: ReviewedMarkRules.none,
  })
  const review = useReviewStore.getState()
  review.focus(ReviewedMarkRules.scopeOf(comparison, changes))
  for (const path of reviewed) {
    review.toggleReviewed(path)
  }
}
