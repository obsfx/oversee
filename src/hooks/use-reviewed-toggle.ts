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

  return { reviewed, toggle, title: reviewed ? 'Unmark as reviewed' : 'Mark as reviewed' }
}
