import { create } from 'zustand'
import { DefinitionTabs, type DefinitionTarget, type TabsState } from '@/src/lib/definition-tabs.ts'
import type { DefinitionTabsPort } from '@/src/lib/definition-tabs-sync.ts'

interface TabStoreState extends TabsState {
  generation: number
  open: (target: DefinitionTarget, generation: number) => void
  close: (id: string) => void
  activate: (id: string) => void
  reset: () => void
}

export const useTabStore = create<TabStoreState>()((set) => {
  return {
    ...DefinitionTabs.initial,
    generation: 0,
    open: (target, generation) => {
      set((state) => {
        if (state.generation !== generation) {
          return state
        }
        return DefinitionTabs.open(state, target, Date.now())
      })
    },
    close: (id) => {
      set((state) => {
        return DefinitionTabs.close(state, id)
      })
    },
    activate: (id) => {
      set((state) => {
        return DefinitionTabs.activate(state, id)
      })
    },
    reset: () => {
      set((state) => {
        return { ...DefinitionTabs.initial, generation: state.generation + 1 }
      })
    },
  }
})

export const definitionTabsPort: DefinitionTabsPort = {
  reset: () => {
    useTabStore.getState().reset()
  },
  showReview: () => {
    useTabStore.getState().activate(DefinitionTabs.reviewId)
  },
}
