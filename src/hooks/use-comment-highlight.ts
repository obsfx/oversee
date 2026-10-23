import { useFocusHighlight } from '@/src/hooks/use-focus-highlight.ts'
import { CommentFocusRequests } from '@/src/lib/comment-focus-requests.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'

export const useCommentHighlight = (commentId: string) => {
  const requestedAt = useNavigationStore((navigation) => {
    return CommentFocusRequests.requestedAt(navigation.focus, commentId)
  })
  const clearFocus = useNavigationStore((navigation) => {
    return navigation.clearFocus
  })

  return useFocusHighlight(requestedAt, clearFocus)
}
