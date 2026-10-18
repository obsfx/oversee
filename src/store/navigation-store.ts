import { create } from 'zustand'
import type { ReviewComment } from '../lib/comment-gateway.ts'

export interface FocusRequest {
  commentId: string
  filePath: string
  line: number
  requestedAt: number
}

interface NavigationState {
  focus: FocusRequest | null
  focusComment: (comment: ReviewComment) => void
}

export const useNavigationStore = create<NavigationState>()((set) => {
  return {
    focus: null,
    focusComment: (comment) => {
      set({
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
