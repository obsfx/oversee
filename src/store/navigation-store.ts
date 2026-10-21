import { create } from 'zustand'
import type { FileSide } from '@/src/lib/change-set.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import type { TabReveal } from '@/src/lib/definition-tabs.ts'
import type { ReviewNavigation } from '@/src/lib/definition-tabs-sync.ts'
import { type LineAnchor, LineRanges } from '@/src/lib/line-range.ts'

export interface FocusRequest {
  commentId: string
  filePath: string
  anchor: LineAnchor
  requestedAt: number
}

interface ReviewReveal extends TabReveal {
  path: string
}

interface NavigationState {
  selectedPath: string | null
  selectedAt: number
  focus: FocusRequest | null
  reveal: ReviewReveal | null
  selectFile: (path: string) => void
  followFile: (path: string) => void
  focusComment: (comment: ReviewComment) => void
  revealLine: (path: string, side: FileSide, line: number) => void
  clearFocus: (requestedAt: number) => void
}

export const useNavigationStore = create<NavigationState>()((set) => {
  return {
    selectedPath: null,
    selectedAt: 0,
    focus: null,
    reveal: null,
    selectFile: (selectedPath) => {
      set({ selectedPath, selectedAt: Date.now(), reveal: null })
    },
    followFile: (selectedPath) => {
      set({ selectedPath, reveal: null })
    },
    revealLine: (path, side, line) => {
      const requestedAt = Date.now()
      set({
        selectedPath: path,
        selectedAt: requestedAt,
        focus: null,
        reveal: { path, side, line, requestedAt },
      })
    },
    focusComment: (comment) => {
      set({
        selectedPath: comment.filePath,
        selectedAt: Date.now(),
        reveal: null,
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
