import { create } from 'zustand'
import { type CommentFocusRequest, CommentFocusRequests } from '@/src/lib/comment-focus-requests.ts'

type CommentsMenuTab = 'current' | 'sessions'

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
        focus: CommentFocusRequests.request(commentId),
      })
    },
    clearFocus: (requestedAt) => {
      set((state) => {
        return { focus: CommentFocusRequests.cleared(state.focus, requestedAt) }
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
