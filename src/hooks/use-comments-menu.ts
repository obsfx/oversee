import { useState } from 'react'
import { useComments } from '@/src/hooks/use-comments.ts'
import { useReviewSessions } from '@/src/hooks/use-review-sessions.ts'

export type CommentsMenuTab = 'current' | 'sessions'

export const useCommentsMenu = () => {
  const { list, countLabel } = useComments()
  const { list: sessions } = useReviewSessions()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<CommentsMenuTab>('current')
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null)
  const openedSession =
    sessions.find((session) => {
      return session.id === openedSessionId
    }) ?? null

  const selectTab = (value: CommentsMenuTab) => {
    setTab(value)
  }

  const close = () => {
    setOpen(false)
  }

  return {
    open,
    setOpen,
    close,
    tab,
    selectTab,
    commentCount: list.length,
    countLabel,
    sessionCount: sessions.length,
    openedSession,
    openSession: setOpenedSessionId,
    closeSession: () => {
      setOpenedSessionId(null)
    },
  }
}
