import { create } from 'zustand'
import type { ReadyServerPort } from '@/src/lib/install-completion-watch.ts'

interface LanguageServerState {
  readyId: string | null
  showReady: (id: string) => void
  hideReady: (id: string) => void
}

export const useLanguageServerStore = create<LanguageServerState>()((set) => {
  return {
    readyId: null,
    showReady: (readyId) => {
      set({ readyId })
    },
    hideReady: (id) => {
      set((state) => {
        return state.readyId === id ? { readyId: null } : {}
      })
    },
  }
})

export const readyServerPort: ReadyServerPort = {
  show: (id) => {
    useLanguageServerStore.getState().showReady(id)
  },
  hide: (id) => {
    useLanguageServerStore.getState().hideReady(id)
  },
}
