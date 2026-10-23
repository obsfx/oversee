import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'
import type { CallFlowConnector, CallFlowRow } from '@/src/lib/call-flow-tree.ts'
import type { TreePosition } from '@/src/lib/tree-keys.ts'
import { CallStackRow } from '@/src/primitives/call-stack-row.tsx'
import { TreeConnectors } from '@/src/primitives/tree-connectors.tsx'
import { TreeGroupLabel } from '@/src/primitives/tree-group-label.tsx'
import { TreeOriginLabel } from '@/src/primitives/tree-origin-label.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'
import { TreeTwisty } from '@/src/primitives/tree-twisty.tsx'
import { ViaLabel } from '@/src/primitives/via-label.tsx'

interface CallFlowRowViewProps {
  id: string
  row: CallFlowRow
  position: TreePosition
  connector: CallFlowConnector
  selected: boolean
  marked: boolean
  onToggle: () => void
  onOpen: () => void
}

export function CallFlowRowView({
  id,
  row,
  position,
  connector,
  selected,
  marked,
  onToggle,
  onOpen,
}: CallFlowRowViewProps) {
  if (row.type === 'group') {
    return (
      <TreeRow
        id={id}
        aria-posinset={position.posInSet}
        aria-setsize={position.setSize}
        depth={row.depth}
        selected={selected}
        expanded={row.expanded}
        onClick={onOpen}
      >
        <TreeTwisty expandable={true} expanded={row.expanded} onToggle={onToggle} />
        <TreeGroupLabel label={CallFlowLabels.notConnected} count={row.count} />
      </TreeRow>
    )
  }
  if (row.type === 'origin') {
    return (
      <TreeRow
        id={id}
        aria-posinset={position.posInSet}
        aria-setsize={position.setSize}
        depth={row.depth}
        selected={selected}
        onClick={onOpen}
      >
        <TreeConnectors depth={row.depth} last={connector.last} continues={connector.continues} />
        <TreeTwisty expandable={false} expanded={false} onToggle={onToggle} />
        <TreeOriginLabel
          text={CallFlowLabels.origin(row.origins)}
          title={CallFlowLabels.originTitle(row.origins)}
        />
      </TreeRow>
    )
  }
  const via = CallFlowLabels.viaOf(row.edge)
  return (
    <CallStackRow
      id={id}
      aria-posinset={position.posInSet}
      aria-setsize={position.setSize}
      depth={row.depth}
      selected={selected}
      marked={marked}
      expandable={row.expandable}
      expanded={row.expanded}
      onToggle={onToggle}
      last={connector.last}
      continues={connector.continues}
      kind={row.node.kind}
      change={row.node.change}
      name={row.node.name}
      location={CallFlowLabels.fileLocation(row.node)}
      cycle={row.cycle}
      title={CallFlowLabels.title(row.node, row.parent, row.edge)}
      via={via && <ViaLabel via={via.via} text={via.text} title={via.title} />}
      onClick={onOpen}
    />
  )
}
