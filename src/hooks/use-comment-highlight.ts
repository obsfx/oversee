import { useNavigationStore } from '@/src/store/navigation-store.ts'

export const useCommentHighlight = (commentId: string) => {
  const requestedAt = useNavigationStore((navigation) => {
    return navigation.focus?.commentId === commentId ? navigation.focus.requestedAt : null
  })
  const clearFocus = useNavigationStore((navigation) => {
    return navigation.clearFocus
  })

  return {
    highlightKey: requestedAt,
    endHighlight: () => {
      if (requestedAt !== null) {
        clearFocus(requestedAt)
      }
    },
  }
}
