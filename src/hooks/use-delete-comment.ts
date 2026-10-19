import { useServices } from '@/src/context/services/use-services.ts'
import { useAsyncAction } from '@/src/hooks/use-async-action.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'

export const useDeleteComment = (commentId: string) => {
  const { comments } = useServices()
  const { comparison } = useComparison()
  const action = useAsyncAction(async () => {
    if (comparison) {
      await comments.remove(comparison, commentId)
    }
  })

  return {
    remove: () => {
      void action.run()
    },
    removing: action.pending,
    failed: action.failed,
  }
}
