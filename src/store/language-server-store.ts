import { create } from 'zustand'
import type { ReadyServerPort } from '@/src/lib/install-completion-watch.ts'

interface LanguageServerState {
  readyId: string | null
  requestFailures: ReadonlyMap<string, string>
  showReady: (id: string) => void
  hideReady: (id: string) => void
  failRequest: (id: string, message: string) => void
  clearRequestFailure: (id: string) => void
}

export const useLanguageServerStore = create<LanguageServerState>()((set) => {
  return {
    readyId: null,
    requestFailures: new Map(),
    showReady: (readyId) => {
      set({ readyId })
    },
    hideReady: (id) => {
      set((state) => {
        return state.readyId === id ? { readyId: null } : {}
      })
    },
    failRequest: (id, message) => {
      set((state) => {
        return { requestFailures: new Map(state.requestFailures).set(id, message) }
      })
    },
    clearRequestFailure: (id) => {
      set((state) => {
        if (!state.requestFailures.has(id)) {
          return {}
        }
        const requestFailures = new Map(state.requestFailures)
        requestFailures.delete(id)
        return { requestFailures }
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
