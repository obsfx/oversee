import { CheckToggle } from '../../primitives/check-toggle.tsx'
import { useReviewStore } from '../../store/review-store.ts'

export function ReviewedToggle({ path }: { path: string }) {
  const reviewed = useReviewStore((review) => {
    return review.reviewed.has(path)
  })
  const toggleReviewed = useReviewStore((review) => {
    return review.toggleReviewed
  })

  return (
    <CheckToggle
      checked={reviewed}
      title={reviewed ? 'Unmark as reviewed' : 'Mark as reviewed'}
      onClick={() => {
        toggleReviewed(path)
      }}
    >
      Reviewed
    </CheckToggle>
  )
}
