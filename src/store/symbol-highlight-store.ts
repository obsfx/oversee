import { create } from 'zustand'
import type { SymbolHighlight } from '@/src/lib/symbol-highlight.ts'
import type { SymbolHighlightPort } from '@/src/lib/symbol-highlight-sync.ts'

interface SymbolHighlightState {
  highlight: SymbolHighlight | null
  show: (highlight: SymbolHighlight) => void
  clear: () => void
}

export const useSymbolHighlightStore = create<SymbolHighlightState>()((set) => {
  return {
    highlight: null,
    show: (highlight) => {
      set({ highlight })
    },
    clear: () => {
      set({ highlight: null })
    },
  }
})

export const symbolHighlightPort: SymbolHighlightPort = {
  current: () => {
    return useSymbolHighlightStore.getState().highlight
  },
  clear: () => {
    if (useSymbolHighlightStore.getState().highlight !== null) {
      useSymbolHighlightStore.getState().clear()
    }
  },
  subscribe: (listener) => {
    return useSymbolHighlightStore.subscribe((state, previous) => {
      if (state.highlight !== previous.highlight) {
        listener()
      }
    })
  },
}
