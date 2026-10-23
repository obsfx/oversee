import { FileTreeLabels } from '@/src/lib/file-tree-labels.ts'
import { useReviewStore } from '@/src/store/review-store.ts'

export const useReviewedToggle = (path: string, onMarked: () => void) => {
  const reviewed = useReviewStore((review) => {
    return review.reviewed.has(path)
  })
  const toggleReviewed = useReviewStore((review) => {
    return review.toggleReviewed
  })

  const toggle = () => {
    toggleReviewed(path)
    if (!reviewed) {
      onMarked()
    }
  }

  return {
    reviewed,
    toggle,
    title: reviewed ? FileTreeLabels.unmarkReviewed : FileTreeLabels.markReviewed,
  }
}
