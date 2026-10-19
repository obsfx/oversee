import { useServices } from '@/src/context/services/use-services.ts'
import { useAsyncAction } from '@/src/hooks/use-async-action.ts'
import { useComments } from '@/src/hooks/use-comments.ts'

export const useOutdatedComments = () => {
  const { comments } = useServices()
  const { comparison, outdated } = useComments()
  const action = useAsyncAction(async () => {
    if (comparison) {
      await comments.removeMany(
        comparison,
        outdated.map((comment) => {
          return comment.id
        }),
      )
    }
  })

  return {
    outdated,
    deleteAll: () => {
      void action.run()
    },
    deleting: action.pending,
    failed: action.failed,
  }
}
