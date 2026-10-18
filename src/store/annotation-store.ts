import { create } from 'zustand'
import type { LineRange } from '@/src/lib/line-range.ts'

export interface LineSelection {
  path: string
  range: LineRange
}

export interface CommentDraft extends LineSelection {
  commentId: string | null
}

interface AnnotationState {
  selection: LineSelection | null
  selecting: boolean
  draft: CommentDraft | null
  select: (selection: LineSelection | null, selecting?: boolean) => void
  openDraft: (draft: CommentDraft) => void
  closeDraft: () => void
}

export const useAnnotationStore = create<AnnotationState>()((set) => {
  return {
    selection: null,
    selecting: false,
    draft: null,
    select: (selection, selecting = false) => {
      set((state) => {
        return { selection, selecting, draft: selection ? null : state.draft }
      })
    },
    openDraft: (draft) => {
      set({ draft, selection: null, selecting: false })
    },
    closeDraft: () => {
      set({ draft: null })
    },
  }
})
