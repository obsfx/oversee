import { ChangeSets } from '@/src/lib/change-set.ts'
import { useReviewStore } from '@/src/store/review-store.ts'
import { useSidebarViewStore } from '@/src/store/sidebar-view-store.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { useFileTree } from '@/src/hooks/use-file-tree.ts'

export const useFilesPanel = () => {
  const { state, retry } = useChangeSet()
  const reviewed = useReviewStore((review) => {
    return review.reviewed
  })
  const hideReviewed = useSidebarViewStore((view) => {
    return view.hideReviewed
  })
  const toggleHideReviewed = useSidebarViewStore((view) => {
    return view.toggleHideReviewed
  })
  const changes = ChangeSets.changesOf(state)
  let visibleChanges = changes
  if (hideReviewed) {
    visibleChanges = changes.filter((change) => {
      return !reviewed.has(change.path)
    })
  }
  const { attachScrollElement, ...tree } = useFileTree(visibleChanges)

  return {
    state,
    retry,
    tree,
    attachScrollElement,
    hideReviewed,
    toggleHideReviewed,
    isEmpty: changes.length === 0,
  }
}
