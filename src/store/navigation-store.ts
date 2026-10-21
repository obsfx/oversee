import { create } from 'zustand'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { ReviewNavigation } from '@/src/lib/definition-tabs-sync.ts'
import { type LineAnchor, LineRanges } from '@/src/lib/line-range.ts'

export interface FocusRequest {
  commentId: string
  filePath: string
  anchor: LineAnchor
  requestedAt: number
}

interface NavigationState {
  selectedPath: string | null
  selectedAt: number
  focus: FocusRequest | null
  selectFile: (path: string) => void
  followFile: (path: string) => void
  focusComment: (comment: ReviewComment) => void
  clearFocus: (requestedAt: number) => void
}

export const useNavigationStore = create<NavigationState>()((set) => {
  return {
    selectedPath: null,
    selectedAt: 0,
    focus: null,
    selectFile: (selectedPath) => {
      set({ selectedPath, selectedAt: Date.now() })
    },
    followFile: (selectedPath) => {
      set({ selectedPath })
    },
    focusComment: (comment) => {
      set({
        selectedPath: comment.filePath,
        selectedAt: Date.now(),
        focus: {
          commentId: comment.id,
          filePath: comment.filePath,
          anchor: LineRanges.anchor(comment.range),
          requestedAt: Date.now(),
        },
      })
    },
    clearFocus: (requestedAt) => {
      set((state) => {
        return state.focus?.requestedAt === requestedAt ? { focus: null } : {}
      })
    },
  }
})

export const reviewNavigationPort: ReviewNavigation = {
  subscribe: (listener) => {
    return useNavigationStore.subscribe((state, previous) => {
      if (state.selectedAt !== previous.selectedAt) {
        listener()
      }
    })
  },
}
