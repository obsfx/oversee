import { useMemo, useState } from 'react'
import type { CallFlowGraph } from '@/src/lib/call-flow.ts'
import { CallFlowConnectors } from '@/src/lib/call-flow-connectors.ts'
import { CallFlowLayouts } from '@/src/lib/call-flow-layouts.ts'
import { CallFlowNavigation } from '@/src/lib/call-flow-navigation.ts'
import { CallFlowOpenWalks } from '@/src/lib/call-flow-open-walks.ts'
import { CallFlowRowKeys } from '@/src/lib/call-flow-row-keys.ts'
import { CallFlowRows } from '@/src/lib/call-flow-rows.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useSidebarViewStore } from '@/src/store/sidebar-view-store.ts'
import { useSymbolHighlightStore } from '@/src/store/symbol-highlight-store.ts'
import { useTreeController } from '@/src/hooks/use-tree-controller.ts'

const navigation = new CallFlowNavigation({
  revealLine: (path, side, line) => {
    useNavigationStore.getState().revealLine(path, side, line)
  },
  highlight: (highlight) => {
    useSymbolHighlightStore.getState().show(highlight)
  },
})

export const useCallFlowTree = (graph: CallFlowGraph) => {
  'use no memo'
  const selectedPath = useNavigationStore((state) => {
    return state.selectedPath
  })
  const collapsed = useSidebarViewStore((view) => {
    return view.collapsedFlowRows
  })
  const opened = useSidebarViewStore((view) => {
    return view.openedFlowRows
  })
  const query = useSidebarViewStore((view) => {
    return view.flowQuery
  })
  const setQuery = useSidebarViewStore((view) => {
    return view.setFlowQuery
  })
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const layout = useMemo(() => {
    return CallFlowLayouts.of(graph)
  }, [graph])
  const openWalk = useMemo(() => {
    return CallFlowOpenWalks.of(graph, layout, query)
  }, [graph, layout, query])
  const rows = useMemo(() => {
    return CallFlowRows.of(graph, layout, openWalk, { collapsed, opened })
  }, [graph, layout, openWalk, collapsed, opened])
  const connectors = useMemo(() => {
    return CallFlowConnectors.of(rows)
  }, [rows])

  const tree = useTreeController({
    rows,
    activeKey,
    query,
    collapsed,
    ancestorKeys: (key) => {
      return CallFlowRowKeys.ancestors(key)
    },
    focus: (row) => {
      setActiveKey(row.key)
    },
    toggle: (row) => {
      useSidebarViewStore.getState().toggleFlowRow(row.key, CallFlowRows.isRepeat(row))
    },
    open: (row, toggle) => {
      setActiveKey(row.key)
      if (row.type === 'group') {
        toggle(row)
        return
      }
      if (row.type === 'node') {
        navigation.open(row)
      }
    },
    collapseAll: () => {
      useSidebarViewStore.getState().collapseFlowRows(openWalk.expandableKeys)
    },
    expandAll: () => {
      useSidebarViewStore.getState().expandFlowRows()
    },
  })

  return {
    ...tree,
    rows,
    connectors,
    activeKey,
    selectedPath,
    query,
    setQuery,
  }
}

export type CallFlowTreeModel = Omit<ReturnType<typeof useCallFlowTree>, 'attachScrollElement'>
