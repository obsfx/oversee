import { useEffect } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import { ReviewSync } from '@/src/lib/review-sync.ts'
import { useComparisonStore } from '@/src/store/comparison-store.ts'
import { useReviewStore } from '@/src/store/review-store.ts'

export const useReviewSync = () => {
  const services = useServices()

  useEffect(() => {
    const sync = new ReviewSync(services, {
      selection: {
        current: () => {
          return useComparisonStore.getState().selected
        },
        replace: (replacement) => {
          useComparisonStore.getState().replace(replacement)
        },
      },
      reviewed: {
        unmark: (paths) => {
          useReviewStore.getState().unmarkReviewed(paths)
        },
      },
    })
    return sync.start()
  }, [services])
}
