import { useState } from 'react'
import { ReviewProgressRules } from '../lib/review-progress.ts'
import { useReviewStore } from '../store/review-store.ts'
import { useChangeSet } from './use-change-set.ts'
import { useFileTreeController } from './use-file-tree-controller.ts'

export const useSidebar = () => {
  const { state, retry } = useChangeSet()
  const reviewed = useReviewStore((review) => {
    return review.reviewed
  })
  const [hideReviewed, setHideReviewed] = useState(false)
  const [allExpanded, setAllExpanded] = useState(true)
  const changes = state.status === 'ready' ? state.data.changes : []
  const changedPaths = changes
    .map((change) => {
      return change.path
    })
    .sort()
  const visiblePaths = hideReviewed
    ? changedPaths.filter((path) => {
        return !reviewed.has(path)
      })
    : changedPaths
  const tree = useFileTreeController(visiblePaths, changes)
  const progress = ReviewProgressRules.of(changedPaths, reviewed)

  const toggleHideReviewed = () => {
    setHideReviewed(!hideReviewed)
  }

  const toggleAllExpanded = () => {
    tree.setExpanded(!allExpanded)
    setAllExpanded(!allExpanded)
  }

  return {
    state,
    retry,
    tree,
    progress,
    hideReviewed,
    toggleHideReviewed,
    allExpanded,
    toggleAllExpanded,
    isEmpty: changedPaths.length === 0,
  }
}
