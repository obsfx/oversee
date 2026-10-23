import type { ComponentProps, ReactNode } from 'react'
import { LuRepeat } from 'react-icons/lu'
import { c } from '@/src/c.ts'
import type { CallFlowChange, CallFlowKind } from '@/src/lib/call-flow.ts'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'
import { ChangeKindIcon } from '@/src/primitives/change-kind-icon.tsx'
import { SymbolKindIcon } from '@/src/primitives/symbol-kind-icon.tsx'
import { TreeConnectors } from '@/src/primitives/tree-connectors.tsx'
import { TreeRow } from '@/src/primitives/tree-row.tsx'
import { TreeTwisty } from '@/src/primitives/tree-twisty.tsx'

interface CallStackRowProps extends Omit<ComponentProps<'div'>, 'children'> {
  depth: number
  selected: boolean
  marked: boolean
  expandable: boolean
  expanded: boolean
  onToggle: () => void
  last: boolean
  continues: readonly boolean[]
  kind: CallFlowKind
  change: CallFlowChange
  name: string
  location: string
  cycle?: boolean
  via?: ReactNode
}

export function CallStackRow({
  depth,
  selected,
  marked,
  expandable,
  expanded,
  onToggle,
  last,
  continues,
  kind,
  change,
  name,
  location,
  cycle = false,
  via,
  ...props
}: CallStackRowProps) {
  return (
    <TreeRow
      depth={depth}
      selected={selected}
      marked={marked}
      expanded={expandable ? expanded : undefined}
      {...props}
    >
      <TreeConnectors depth={depth} last={last} continues={continues} />
      <TreeTwisty expandable={expandable} expanded={expanded} onToggle={onToggle} />
      <SymbolKindIcon kind={kind} />
      <ChangeKindIcon change={change} />
      <span
        className={c('min-w-0 truncate', change === 'removed' && 'text-sidebar-muted line-through')}
      >
        {name}
      </span>
      <span className={'min-w-0 shrink-[10] truncate pl-0.5 text-mini text-sidebar-muted'}>
        {location}
      </span>
      {via}
      {cycle && (
        <span className={'flex shrink-0 items-center gap-0.5 text-mini text-sidebar-muted'}>
          <LuRepeat className={'size-3'} />
          {CallFlowLabels.cycle}
        </span>
      )}
    </TreeRow>
  )
}
