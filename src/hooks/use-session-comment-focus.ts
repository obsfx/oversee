import { useEffect, useState } from 'react'
import { useFocusHighlight } from '@/src/hooks/use-focus-highlight.ts'
import { CommentFocusRequests } from '@/src/lib/comment-focus-requests.ts'
import { useCommentsMenuStore } from '@/src/store/comments-menu-store.ts'

export const useSessionCommentFocus = (commentId: string) => {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const requestedAt = useCommentsMenuStore((menu) => {
    return CommentFocusRequests.requestedAt(menu.focus, commentId)
  })
  const clearFocus = useCommentsMenuStore((menu) => {
    return menu.clearFocus
  })
  const highlight = useFocusHighlight(requestedAt, clearFocus)

  useEffect(() => {
    if (element && requestedAt !== null) {
      element.scrollIntoView({ block: 'center' })
    }
  }, [element, requestedAt])

  return { attach: setElement, ...highlight }
}
