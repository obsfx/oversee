import { useState } from 'react'
import { useNotifications } from '@/src/hooks/use-notifications.ts'
import type { ReviewNotification } from '@/src/lib/notification-gateway.ts'

export const useNotificationsMenu = () => {
  const notifications = useNotifications()
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
  }
}
