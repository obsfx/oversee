import plur from 'plur'
import { useServices } from '../context/services/use-services.ts'
import { useNavigationStore } from '../store/navigation-store.ts'
import { useResource } from './use-resource.ts'

export const useComments = () => {
  const { comments } = useServices()
  const state = useResource(comments)
  const focusComment = useNavigationStore((navigation) => {
    return navigation.focusComment
  })
  const list = state.status === 'ready' ? state.data : []
  const countLabel = `${list.length} ${plur('comment', list.length)}`

  return { state, list, countLabel, focusComment }
}
