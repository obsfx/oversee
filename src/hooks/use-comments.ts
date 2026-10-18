import plur from 'plur'
import { useServices } from '@/src/context/services/use-services.ts'
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
  const list = state.status === 'ready' ? state.data : []
  const countLabel = `${list.length} ${plur('comment', list.length)}`

  return { comparison, state, list, countLabel, focusComment }
}
