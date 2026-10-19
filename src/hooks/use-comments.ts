import { useServices } from '@/src/context/services/use-services.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import { CommentLabels } from '@/src/lib/comment-labels.ts'
import { CommentLists } from '@/src/lib/comment-lists.ts'
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
  const outdated = CommentLists.outdated(list)

  return {
    comparison,
    state,
    list,
    live: CommentLists.live(list),
    outdated,
    countLabel: CommentLabels.summary(list.length, outdated.length),
    focusComment,
  }
}
