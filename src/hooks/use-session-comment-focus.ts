import { useEffect, useState } from 'react'
import { useCommentsMenuStore } from '@/src/store/comments-menu-store.ts'

export const useSessionCommentFocus = (commentId: string) => {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const requestedAt = useCommentsMenuStore((menu) => {
    return menu.focus?.commentId === commentId ? menu.focus.requestedAt : null
  })
  const clearFocus = useCommentsMenuStore((menu) => {
    return menu.clearFocus
  })

  useEffect(() => {
    if (element && requestedAt !== null) {
      element.scrollIntoView({ block: 'center' })
    }
  }, [element, requestedAt])

  return {
    attach: setElement,
    highlightKey: requestedAt,
    endHighlight: () => {
      if (requestedAt !== null) {
        clearFocus(requestedAt)
      }
    },
  }
}
