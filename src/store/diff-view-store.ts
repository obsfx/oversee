import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DiffViewMode = 'split' | 'unified'

interface DiffViewPreferences {
  viewMode: DiffViewMode
  unchangedExpanded: boolean
}

interface DiffViewState extends DiffViewPreferences {
  setViewMode: (viewMode: DiffViewMode) => void
  toggleUnchanged: () => void
}

export const useDiffViewStore = create<DiffViewState>()(
  persist(
    (set) => {
      return {
        viewMode: 'split',
        unchangedExpanded: false,
        setViewMode: (viewMode) => {
          set({ viewMode })
        },
        toggleUnchanged: () => {
          set((state) => {
            return { unchangedExpanded: !state.unchangedExpanded }
          })
        },
      }
    },
    {
      name: 'oversee.diff-view',
      partialize: (state): DiffViewPreferences => {
        return { viewMode: state.viewMode, unchangedExpanded: state.unchangedExpanded }
      },
      merge: (persisted, current) => {
        const preferences = persisted as Partial<DiffViewPreferences> | undefined
        return {
          ...current,
          viewMode: preferences?.viewMode === 'unified' ? 'unified' : 'split',
          unchangedExpanded: preferences?.unchangedExpanded === true,
        }
      },
    },
  ),
)
