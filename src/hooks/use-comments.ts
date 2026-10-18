import { useServices } from '@/src/context/services/use-services.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import { CountLabels } from '@/src/lib/count-labels.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { useResource } from '@/src/hooks/use-resource.ts'

export const useComments = () => {
  const { comments } = useServices()
  const { comparison } = useComparison()
  const state = useResource(comparison ? comments.of(comparison) : null)
  const focusComment = useNavigationStore((navigation) => {
    return navigation.focusComment
  })
  const list = ResourceStates.dataOr(state, [])
  const countLabel = CountLabels.of(list.length, 'comment')

  return { comparison, state, list, countLabel, focusComment }
}
