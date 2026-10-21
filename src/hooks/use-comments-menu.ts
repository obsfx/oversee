import { useComments } from '@/src/hooks/use-comments.ts'
import { useReviewSessions } from '@/src/hooks/use-review-sessions.ts'
import { useCommentsMenuStore } from '@/src/store/comments-menu-store.ts'

export const useCommentsMenu = () => {
  const { list, outdated, countLabel } = useComments()
  const { list: sessions } = useReviewSessions()
  const open = useCommentsMenuStore((menu) => {
    return menu.open
  })
  const tab = useCommentsMenuStore((menu) => {
    return menu.tab
  })
  const openedSessionId = useCommentsMenuStore((menu) => {
    return menu.openedSessionId
  })
  const outdatedOpen = useCommentsMenuStore((menu) => {
    return menu.outdatedOpen
  })
  const setOpen = useCommentsMenuStore((menu) => {
    return menu.setOpen
  })
  const selectTab = useCommentsMenuStore((menu) => {
    return menu.selectTab
  })
  const openSession = useCommentsMenuStore((menu) => {
    return menu.openSession
  })
  const closeSession = useCommentsMenuStore((menu) => {
    return menu.closeSession
  })
  const setOutdatedOpen = useCommentsMenuStore((menu) => {
    return menu.setOutdatedOpen
  })
  const resetAfterClose = useCommentsMenuStore((menu) => {
    return menu.resetAfterClose
  })

  return {
    open,
    setOpen,
    close: () => {
      setOpen(false)
    },
    settle: (open: boolean) => {
      if (!open) {
        resetAfterClose()
      }
    },
    tab,
    selectTab,
    commentCount: list.length,
    countLabel,
    sessionCount: sessions.length,
    openedSessionId,
    openSession,
    closeSession,
    outdatedOpen: outdatedOpen && outdated.length > 0,
    openOutdated: () => {
      setOutdatedOpen(true)
    },
    closeOutdated: () => {
      setOutdatedOpen(false)
    },
  }
}
