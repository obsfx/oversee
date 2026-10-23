export interface TreePosition {
  posInSet: number
  setSize: number
}

export interface TreeKeyedRow {
  key: string
  parentKey: string | null
}

export interface TreeExpandableRow extends TreeKeyedRow {
  expandable: boolean
  expanded: boolean
}

export type TreeCommand<R> = { action: 'focus' | 'toggle' | 'open'; row: R } | { action: 'stay' }

export abstract class TreeKeys {
  static command<R extends TreeExpandableRow>(
    rows: readonly R[],
    activeIndex: number,
    anchorIndex: number,
    key: string,
    filtering: boolean,
  ): TreeCommand<R> | null {
    const move = TreeKeys.move(rows, anchorIndex, key)
    if (move !== null) {
      return TreeKeys.focusOf(move.target)
    }
    const current = activeIndex >= 0 ? rows[activeIndex] : undefined
    if (current === undefined) {
      return null
    }
    if (key === 'ArrowRight' && current.expandable) {
      if (!current.expanded) {
        return { action: 'toggle', row: current }
      }
      return TreeKeys.focusOf(rows[activeIndex + 1])
    }
    if (key === 'ArrowLeft') {
      if (current.expandable && current.expanded && !filtering) {
        return { action: 'toggle', row: current }
      }
      return TreeKeys.focusOf(
        rows.find((row) => {
          return row.key === current.parentKey
        }),
      )
    }
    if (key === 'Enter' || key === ' ') {
      return { action: 'open', row: current }
    }
    return null
  }

  static anchorIndex<R extends TreeKeyedRow>(
    rows: readonly R[],
    activeIndex: number,
    activeKey: string | null,
    ancestorKeys: (key: string) => readonly string[],
  ) {
    if (activeIndex >= 0 || activeKey === null) {
      return activeIndex
    }
    for (const key of ancestorKeys(activeKey)) {
      const index = rows.findIndex((row) => {
        return row.key === key
      })
      if (index >= 0) {
        return index
      }
    }
    return -1
  }

  static allExpanded(
    rows: readonly TreeKeyedRow[],
    collapsed: ReadonlySet<string>,
    filtering: boolean,
  ) {
    return (
      filtering ||
      !rows.some((row) => {
        return collapsed.has(row.key)
      })
    )
  }

  static positions(rows: readonly TreeKeyedRow[]): TreePosition[] {
    const sizes = new Map<string | null, number>()
    const posInSets = rows.map((row) => {
      const posInSet = (sizes.get(row.parentKey) ?? 0) + 1
      sizes.set(row.parentKey, posInSet)
      return posInSet
    })
    return rows.map((row, index) => {
      return { posInSet: posInSets[index], setSize: sizes.get(row.parentKey) ?? 0 }
    })
  }

  static toggled(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
    const next = new Set(keys)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    return next
  }

  private static move<R>(
    rows: readonly R[],
    anchorIndex: number,
    key: string,
  ): { target: R | undefined } | null {
    if (key === 'ArrowDown') {
      return { target: rows[Math.min(anchorIndex + 1, rows.length - 1)] }
    }
    if (key === 'ArrowUp') {
      return { target: anchorIndex > 0 ? rows[anchorIndex - 1] : rows[0] }
    }
    if (key === 'Home') {
      return { target: rows[0] }
    }
    if (key === 'End') {
      return { target: rows[rows.length - 1] }
    }
    return null
  }

  private static focusOf<R>(row: R | undefined): TreeCommand<R> {
    if (row === undefined) {
      return { action: 'stay' }
    }
    return { action: 'focus', row }
  }
}
