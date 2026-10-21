import { useState } from 'react'
import { useNotifications } from '@/src/hooks/use-notifications.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'
import { useCommentsMenuStore } from '@/src/store/comments-menu-store.ts'

export const useNotificationsMenu = () => {
  const notifications = useNotifications()
  const showComment = useCommentsMenuStore((menu) => {
    return menu.showComment
  })
  const [open, setOpen] = useState(false)
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null)

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setOpenedSessionId(null)
    }
  }

  const openNotification = (notification: ReviewNotification) => {
    notifications.markRead(notification)
    if (notification.kind === 'comment-reply') {
      changeOpen(false)
      showComment(notification.sessionId, notification.commentId)
      return
    }
    setOpenedSessionId(notification.sessionId)
  }

  return {
    ...notifications,
    open,
    setOpen: changeOpen,
    openedSessionId,
    openNotification,
    closeSession: () => {
      setOpenedSessionId(null)
    },
    close: () => {
      changeOpen(false)
    },
  }
}
