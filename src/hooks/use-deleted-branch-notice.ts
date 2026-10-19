import { ComparisonLabels } from '@/src/lib/comparison-labels.ts'
import { useComparisonStore } from '@/src/store/comparison-store.ts'

export const useDeletedBranchNotice = () => {
  const notice = useComparisonStore((state) => {
    return state.notice
  })
  const dismiss = useComparisonStore((state) => {
    return state.dismissNotice
  })

  if (!notice) {
    return null
  }
  return {
    title: ComparisonLabels.deleted(notice.deleted),
    detail: ComparisonLabels.showing(notice.comparison),
    dismiss,
  }
}
