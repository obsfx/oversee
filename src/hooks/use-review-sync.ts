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
        subscribe: (listener) => {
          return useComparisonStore.subscribe((state, previous) => {
            if (state.selected !== previous.selected) {
              listener()
            }
          })
        },
      },
      marks: {
        hydrate: (marks) => {
          useReviewStore.getState().hydrate(marks)
        },
        focus: (scope) => {
          useReviewStore.getState().focus(scope)
        },
        subscribe: (listener) => {
          return useReviewStore.subscribe((state, previous) => {
            if (state.marks !== previous.marks) {
              listener(state.marks)
            }
          })
        },
      },
    })
    return sync.start()
  }, [services])
}
