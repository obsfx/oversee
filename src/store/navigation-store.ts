import { create } from 'zustand'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { type LineAnchor, LineRanges } from '@/src/lib/line-range.ts'

export interface FocusRequest {
  commentId: string
  filePath: string
  anchor: LineAnchor
  requestedAt: number
}

interface NavigationState {
  selectedPath: string | null
  focus: FocusRequest | null
  selectFile: (path: string) => void
  focusComment: (comment: ReviewComment) => void
  clearFocus: (requestedAt: number) => void
}

export const useNavigationStore = create<NavigationState>()((set) => {
  return {
    selectedPath: null,
    focus: null,
    selectFile: (selectedPath) => {
      set({ selectedPath })
    },
    focusComment: (comment) => {
      set({
        selectedPath: comment.filePath,
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
