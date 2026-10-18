import { create } from 'zustand'
import type { ReviewComment } from '../lib/comment-gateway.ts'

export interface FocusRequest {
  commentId: string
  filePath: string
  line: number
  requestedAt: number
}

interface NavigationState {
  selectedPath: string | null
  focus: FocusRequest | null
  selectFile: (path: string) => void
  focusComment: (comment: ReviewComment) => void
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
          line: comment.line,
          requestedAt: Date.now(),
        },
      })
    },
  }
})
