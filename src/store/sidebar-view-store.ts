import { create } from 'zustand'
import { FileTreeRows } from '@/src/lib/file-tree-rows.ts'
import { TreeKeys } from '@/src/lib/tree-keys.ts'

interface SidebarViewState {
  hideReviewed: boolean
  fileQuery: string
  collapsedFolders: ReadonlySet<string>
  revealedPath: string | null
  flowQuery: string
  collapsedFlowRows: ReadonlySet<string>
  openedFlowRows: ReadonlySet<string>
  toggleHideReviewed: () => void
  setFileQuery: (query: string) => void
  toggleFolder: (key: string) => void
  expandFolders: () => void
  collapseFolders: (keys: Iterable<string>) => void
  revealFile: (path: string | null) => void
  setFlowQuery: (query: string) => void
  toggleFlowRow: (key: string, repeat: boolean) => void
  expandFlowRows: () => void
  collapseFlowRows: (keys: Iterable<string>) => void
}

export const useSidebarViewStore = create<SidebarViewState>()((set) => {
  return {
    hideReviewed: false,
    fileQuery: '',
    collapsedFolders: new Set(),
    revealedPath: null,
    flowQuery: '',
    collapsedFlowRows: new Set(),
    openedFlowRows: new Set(),
    toggleHideReviewed: () => {
      set((state) => {
        return { hideReviewed: !state.hideReviewed }
      })
    },
    setFileQuery: (fileQuery) => {
      set({ fileQuery })
    },
    toggleFolder: (key) => {
      set((state) => {
        return { collapsedFolders: TreeKeys.toggled(state.collapsedFolders, key) }
      })
    },
    expandFolders: () => {
      set({ collapsedFolders: new Set() })
    },
    collapseFolders: (keys) => {
      set({ collapsedFolders: new Set(keys) })
    },
    revealFile: (path) => {
      set((state) => {
        if (path === state.revealedPath) {
          return state
        }
        if (path === null) {
          return { revealedPath: null }
        }
        return {
          revealedPath: path,
          collapsedFolders: FileTreeRows.revealed(state.collapsedFolders, path),
        }
      })
    },
    setFlowQuery: (flowQuery) => {
      set({ flowQuery })
    },
    toggleFlowRow: (key, repeat) => {
      set((state) => {
        if (repeat) {
          return { openedFlowRows: TreeKeys.toggled(state.openedFlowRows, key) }
        }
        return { collapsedFlowRows: TreeKeys.toggled(state.collapsedFlowRows, key) }
      })
    },
    expandFlowRows: () => {
      set({ collapsedFlowRows: new Set(), openedFlowRows: new Set() })
    },
    collapseFlowRows: (keys) => {
      set({ collapsedFlowRows: new Set(keys), openedFlowRows: new Set() })
    },
  }
})
