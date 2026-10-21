import type { FileChange, FileSide } from '@/src/lib/change-set.ts'

export type DefinitionTabView = 'diff' | 'file'

export interface DefinitionTarget {
  path: string
  external: boolean
  side: FileSide
  line: number
}

export interface TabReveal {
  side: FileSide
  line: number
  requestedAt: number
}

export interface DefinitionTab {
  id: string
  path: string
  external: boolean
  reveal: TabReveal
  openerId: string
}

export interface TabsState {
  tabs: DefinitionTab[]
  activeId: string
}

export abstract class DefinitionTabs {
  static readonly reviewId = 'review'

  static readonly initial: TabsState = { tabs: [], activeId: DefinitionTabs.reviewId }

  static idOf({ path, external }: Pick<DefinitionTarget, 'path' | 'external'>) {
    return `${external ? 'external' : 'repo'}::${path}`
  }

  static open(state: TabsState, target: DefinitionTarget, requestedAt: number): TabsState {
    const id = DefinitionTabs.idOf(target)
    const reveal = { side: target.side, line: target.line, requestedAt }
    const existing = state.tabs.some((tab) => {
      return tab.id === id
    })
    if (existing) {
      return {
        activeId: id,
        tabs: state.tabs.map((tab) => {
          return tab.id === id ? { ...tab, reveal } : tab
        }),
      }
    }
    const tab: DefinitionTab = {
      id,
      path: target.path,
      external: target.external,
      reveal,
      openerId: state.activeId,
    }
    return { activeId: id, tabs: [...state.tabs, tab] }
  }

  static close(state: TabsState, id: string): TabsState {
    const closing = state.tabs.find((tab) => {
      return tab.id === id
    })
    if (!closing) {
      return state
    }
    const tabs = state.tabs
      .filter((tab) => {
        return tab.id !== id
      })
      .map((tab) => {
        return tab.openerId === id ? { ...tab, openerId: closing.openerId } : tab
      })
    let activeId = state.activeId
    if (activeId === id) {
      activeId = closing.openerId
    }
    return { tabs, activeId }
  }

  static activate(state: TabsState, id: string): TabsState {
    const known =
      id === DefinitionTabs.reviewId ||
      state.tabs.some((tab) => {
        return tab.id === id
      })
    if (!known || state.activeId === id) {
      return state
    }
    return { ...state, activeId: id }
  }

  static viewOf(tab: DefinitionTab, changes: FileChange[] | null): DefinitionTabView {
    if (tab.external) {
      return 'file'
    }
    if (changes === null) {
      return 'diff'
    }
    const changed = changes.some((change) => {
      return change.path === tab.path
    })
    return changed ? 'diff' : 'file'
  }

  static revealKey(state: TabsState) {
    return `${state.activeId}::${DefinitionTabs.active(state)?.reveal.requestedAt ?? 0}`
  }

  static active(state: TabsState) {
    return (
      state.tabs.find((tab) => {
        return tab.id === state.activeId
      }) ?? null
    )
  }
}
