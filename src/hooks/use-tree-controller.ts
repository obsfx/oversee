import type { KeyboardEvent } from 'react'
import { TextQueries } from '@/src/lib/text-queries.ts'
import { type TreeExpandableRow, TreeKeys } from '@/src/lib/tree-keys.ts'
import { useTreeVirtualizer } from '@/src/hooks/use-tree-virtualizer.ts'

interface TreeControllerOptions<R extends TreeExpandableRow> {
  rows: readonly R[]
  activeKey: string | null
  query: string
  collapsed: ReadonlySet<string>
  ancestorKeys: (key: string) => readonly string[]
  focus: (row: R) => void
  toggle: (row: R) => void
  open: (row: R, toggle: (row: R) => void) => void
  collapseAll: () => void
  expandAll: () => void
}

export const useTreeController = <R extends TreeExpandableRow>(
  options: TreeControllerOptions<R>,
) => {
  'use no memo'
  const { rows, activeKey, query, collapsed } = options
  const virtual = useTreeVirtualizer(rows, activeKey)
  const filtering = TextQueries.isActive(query)
  const allExpanded = TreeKeys.allExpanded(rows, collapsed, filtering)

  const toggle = (row: R) => {
    if (filtering) {
      return
    }
    options.toggle(row)
  }

  const toggleAllExpanded = () => {
    if (filtering) {
      return
    }
    if (allExpanded) {
      options.collapseAll()
      return
    }
    options.expandAll()
  }

  const open = (row: R) => {
    options.open(row, toggle)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const anchorIndex = TreeKeys.anchorIndex(
      rows,
      virtual.activeIndex,
      activeKey,
      options.ancestorKeys,
    )
    const command = TreeKeys.command(rows, virtual.activeIndex, anchorIndex, event.key, filtering)
    if (command === null) {
      return
    }
    event.preventDefault()
    if (command.action === 'focus') {
      options.focus(command.row)
      return
    }
    if (command.action === 'toggle') {
      toggle(command.row)
      return
    }
    if (command.action === 'open') {
      open(command.row)
    }
  }

  return { ...virtual, filtering, allExpanded, toggle, toggleAllExpanded, open, onKeyDown }
}
