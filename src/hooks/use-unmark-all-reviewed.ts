import { useState } from 'react'
import { CountLabels } from '@/src/lib/count-labels.ts'
import { useReviewStore } from '@/src/store/review-store.ts'

export const useUnmarkAllReviewed = () => {
  const count = useReviewStore((review) => {
    return review.reviewed.size
  })
  const unmarkAll = useReviewStore((review) => {
    return review.unmarkAll
  })
  const [confirmOpen, setConfirmOpen] = useState(false)

  const confirm = () => {
    unmarkAll()
    setConfirmOpen(false)
  }

  return {
    label: 'Unmark all reviewed',
    disabled: count === 0,
    title: `Unmark ${CountLabels.of(count, 'reviewed file')}?`,
    confirmOpen: confirmOpen && count > 0,
    setConfirmOpen,
    confirm,
  }
}
