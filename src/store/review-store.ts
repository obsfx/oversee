import { create } from 'zustand'

interface ReviewState {
  reviewed: ReadonlySet<string>
  toggleReviewed: (path: string) => void
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
  }
})
