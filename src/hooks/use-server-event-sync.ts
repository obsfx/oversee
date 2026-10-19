import { useEffect } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import { useReviewStore } from '@/src/store/review-store.ts'

export const useServerEventSync = () => {
  const { serverSync } = useServices()
  const unmarkReviewed = useReviewStore((review) => {
    return review.unmarkReviewed
  })

  useEffect(() => {
    return serverSync.start((change) => {
      unmarkReviewed(change.paths)
    })
  }, [serverSync, unmarkReviewed])
}
