import { create } from 'zustand'
import type { Comparison, ComparisonReplacement } from '@/src/lib/comparison-rules.ts'

interface ComparisonState {
  selected: Comparison | null
  notice: ComparisonReplacement | null
  select: (comparison: Comparison) => void
  replace: (replacement: ComparisonReplacement) => void
  dismissNotice: () => void
}

export const useComparisonStore = create<ComparisonState>()((set) => {
  return {
    selected: null,
    notice: null,
    select: (comparison) => {
      set({ selected: comparison, notice: null })
    },
    replace: (replacement) => {
      set({ selected: replacement.comparison, notice: replacement })
    },
    dismissNotice: () => {
      set({ notice: null })
    },
  }
})
