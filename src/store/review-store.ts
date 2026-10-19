import { create } from 'zustand'
import {
  ReviewedMarkRules,
  type ReviewedMarks,
  type ReviewedView,
  type ReviewScope,
} from '@/src/lib/reviewed-marks.ts'

interface ReviewState extends ReviewedView {
  toggleReviewed: (path: string) => void
  unmarkAll: () => void
  hydrate: (marks: ReviewedMarks) => void
  focus: (scope: ReviewScope | null) => void
}

export const useReviewStore = create<ReviewState>()((set) => {
  return {
    marks: ReviewedMarkRules.empty,
    scope: null,
    reviewed: ReviewedMarkRules.none,
    toggleReviewed: (path) => {
      set((state) => {
        const marks = ReviewedMarkRules.toggle(state.marks, state.scope, path)
        return ReviewedMarkRules.view(marks, state.scope, state.reviewed)
      })
    },
    unmarkAll: () => {
      set((state) => {
        const marks = ReviewedMarkRules.clear(state.marks, state.scope)
        return ReviewedMarkRules.view(marks, state.scope, state.reviewed)
      })
    },
    hydrate: (marks) => {
      set((state) => {
        return ReviewedMarkRules.view(
          ReviewedMarkRules.prune(marks, state.scope),
          state.scope,
          state.reviewed,
        )
      })
    },
    focus: (scope) => {
      set((state) => {
        return ReviewedMarkRules.view(
          ReviewedMarkRules.prune(state.marks, scope),
          scope,
          state.reviewed,
        )
      })
    },
  }
})
