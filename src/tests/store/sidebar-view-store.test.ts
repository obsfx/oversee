import { beforeEach, describe, expect, it } from 'vitest'
import { useSidebarViewStore } from '@/src/store/sidebar-view-store.ts'

describe('useSidebarViewStore', () => {
  beforeEach(() => {
    useSidebarViewStore.setState(useSidebarViewStore.getInitialState(), true)
  })

  it('keeps the file and flow view state independent of each other', () => {
    const store = useSidebarViewStore.getState()
    store.toggleHideReviewed()
    store.setFileQuery('flow')
    store.toggleFolder('src/')
    store.setFlowQuery('runMain')
    store.toggleFlowRow('main', false)
    store.toggleFlowRow('main>log', true)

    const state = useSidebarViewStore.getState()
    expect(state.hideReviewed).toBe(true)
    expect(state.fileQuery).toBe('flow')
    expect(state.collapsedFolders).toEqual(new Set(['src/']))
    expect(state.flowQuery).toBe('runMain')
    expect(state.collapsedFlowRows).toEqual(new Set(['main']))
    expect(state.openedFlowRows).toEqual(new Set(['main>log']))
  })

  it('reveals a file once per selection', () => {
    const store = useSidebarViewStore.getState()
    store.collapseFolders(['src/', 'src/lib/'])
    store.revealFile('src/lib/flow.ts')
    expect(useSidebarViewStore.getState().collapsedFolders).toEqual(new Set())

    store.toggleFolder('src/')
    store.revealFile('src/lib/flow.ts')
    expect(useSidebarViewStore.getState().collapsedFolders).toEqual(new Set(['src/']))

    store.revealFile('src/main.ts')
    expect(useSidebarViewStore.getState().collapsedFolders).toEqual(new Set())
  })

  it('expands and collapses flow rows as a whole', () => {
    const store = useSidebarViewStore.getState()
    store.toggleFlowRow('main>log', true)
    store.collapseFlowRows(['main', 'main>config'])
    expect(useSidebarViewStore.getState().collapsedFlowRows).toEqual(
      new Set(['main', 'main>config']),
    )
    expect(useSidebarViewStore.getState().openedFlowRows).toEqual(new Set())

    store.toggleFlowRow('main>log', true)
    store.expandFlowRows()
    expect(useSidebarViewStore.getState().collapsedFlowRows).toEqual(new Set())
    expect(useSidebarViewStore.getState().openedFlowRows).toEqual(new Set())
  })
})
