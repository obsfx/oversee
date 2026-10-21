import { useState } from 'react'
import { ChangeSets } from '@/src/lib/change-set.ts'
import { useReviewStore } from '@/src/store/review-store.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { useFileTreeController } from '@/src/hooks/use-file-tree-controller.ts'

export const useSidebar = () => {
  const { state, retry } = useChangeSet()
  const reviewed = useReviewStore((review) => {
    return review.reviewed
  })
  const [hideReviewed, setHideReviewed] = useState(false)
  const [allExpanded, setAllExpanded] = useState(true)
  const changes = ChangeSets.changesOf(state)
  const changedPaths = changes
    .map((change) => {
      return change.path
    })
    .sort()
  let visiblePaths = changedPaths
  if (hideReviewed) {
    visiblePaths = changedPaths.filter((path) => {
      return !reviewed.has(path)
    })
  }
  const tree = useFileTreeController(visiblePaths, changes)

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
    hideReviewed,
    toggleHideReviewed,
    allExpanded,
    toggleAllExpanded,
    isEmpty: changedPaths.length === 0,
  }
}
