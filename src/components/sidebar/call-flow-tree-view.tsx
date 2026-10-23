import type { CallFlowTreeModel } from '@/src/hooks/use-call-flow-tree.ts'
import type { ScrollElementRef } from '@/src/hooks/use-tree-virtualizer.ts'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'
import { TreeScroller } from '@/src/primitives/tree-scroller.tsx'
import { VirtualRow } from '@/src/primitives/virtual-row.tsx'
import { CallFlowRowView } from '@/src/components/sidebar/call-flow-row-view.tsx'

const ROOT_CONNECTOR = { last: true, continues: [] }

interface CallFlowTreeViewProps {
  tree: CallFlowTreeModel
  scroller: ScrollElementRef
}

export function CallFlowTreeView({ tree, scroller }: CallFlowTreeViewProps) {
  'use no memo'
  return (
    <TreeScroller
      ref={scroller}
      aria-label={CallFlowLabels.tree}
      aria-activedescendant={tree.activeDescendant}
      totalSize={tree.totalSize}
      onKeyDown={tree.onKeyDown}
    >
      {tree.virtualRows.map(({ row, start, position }) => {
        return (
          <VirtualRow key={row.key} start={start}>
            <CallFlowRowView
              id={tree.rowId(row.key)}
              row={row}
              position={position}
              connector={tree.connectors.get(row.key) ?? ROOT_CONNECTOR}
              selected={row.key === tree.activeKey}
              marked={row.type === 'node' && row.node.path === tree.selectedPath}
              onToggle={() => {
                tree.toggle(row)
              }}
              onOpen={() => {
                tree.open(row)
              }}
            />
          </VirtualRow>
        )
      })}
    </TreeScroller>
  )
}
