import { create } from 'zustand'

type CommentsMenuTab = 'current' | 'sessions'

interface CommentFocusRequest {
  commentId: string
  requestedAt: number
}

interface CommentsMenuState {
  open: boolean
  tab: CommentsMenuTab
  openedSessionId: string | null
  outdatedOpen: boolean
  focus: CommentFocusRequest | null
  setOpen: (open: boolean) => void
  selectTab: (tab: CommentsMenuTab) => void
  openSession: (sessionId: string) => void
  closeSession: () => void
  setOutdatedOpen: (open: boolean) => void
  showComment: (sessionId: string, commentId: string) => void
  clearFocus: (requestedAt: number) => void
  resetAfterClose: () => void
}

export const useCommentsMenuStore = create<CommentsMenuState>()((set) => {
  return {
    open: false,
    tab: 'current',
    openedSessionId: null,
    outdatedOpen: false,
    focus: null,
    setOpen: (open) => {
      set({ open })
    },
    selectTab: (tab) => {
      set({ tab })
    },
    openSession: (openedSessionId) => {
      set({ openedSessionId, focus: null })
    },
    closeSession: () => {
      set({ openedSessionId: null, focus: null })
    },
    setOutdatedOpen: (outdatedOpen) => {
      set({ outdatedOpen })
    },
    showComment: (openedSessionId, commentId) => {
      set({
        open: true,
        tab: 'sessions',
        openedSessionId,
        focus: { commentId, requestedAt: Date.now() },
      })
    },
    clearFocus: (requestedAt) => {
      set((state) => {
        return state.focus?.requestedAt === requestedAt ? { focus: null } : {}
      })
    },
    resetAfterClose: () => {
      set((state) => {
        if (state.open) {
          return {}
        }
        return { openedSessionId: null, outdatedOpen: false, focus: null }
      })
    },
  }
})
