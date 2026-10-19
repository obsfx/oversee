import { create } from 'zustand'

interface ReviewState {
  reviewed: ReadonlySet<string>
  toggleReviewed: (path: string) => void
  unmarkReviewed: (paths: readonly string[]) => void
}

export const useReviewStore = create<ReviewState>()((set) => {
  return {
    reviewed: new Set(),
    toggleReviewed: (path) => {
      set((state) => {
        const reviewed = new Set(state.reviewed)
        if (reviewed.has(path)) {
          reviewed.delete(path)
        } else {
          reviewed.add(path)
        }
        return { reviewed }
      })
    },
    unmarkReviewed: (paths) => {
      set((state) => {
        const reviewed = new Set(state.reviewed)
        for (const path of paths) {
          reviewed.delete(path)
        }
        return reviewed.size === state.reviewed.size ? state : { reviewed }
      })
    },
  }
})
