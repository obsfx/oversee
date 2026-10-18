import { create } from 'zustand'
import type { Comparison } from '@/src/lib/comparison-rules.ts'

interface ComparisonState {
  selected: Comparison | null
  select: (comparison: Comparison) => void
}

export const useComparisonStore = create<ComparisonState>()((set) => {
  return {
    selected: null,
    select: (comparison) => {
      set({ selected: comparison })
    },
  }
})
