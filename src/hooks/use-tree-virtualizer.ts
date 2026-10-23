import { useEffect, useId, useMemo, useRef } from 'react'
import { SettingsSchema } from '@/src/lib/settings-schema.ts'
import { type TreeKeyedRow, TreeKeys } from '@/src/lib/tree-keys.ts'
import { TreeMetrics } from '@/src/lib/tree-metrics.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'
import { useListVirtualizer } from '@/src/hooks/use-list-virtualizer.ts'

export const useTreeVirtualizer = <R extends TreeKeyedRow>(
  rows: readonly R[],
  activeKey: string | null,
) => {
  'use no memo'
  const treeId = useId()
  const reveal = useRef({ key: activeKey, pending: activeKey !== null })
  const uiFontSize = useSettingsStore((settings) => {
    return settings.uiFontSize
  })
  const rowHeight = TreeMetrics.rowHeight(SettingsSchema.uiScale(uiFontSize))
  const positions = useMemo(() => {
    return TreeKeys.positions(rows)
  }, [rows])
  const activeIndex = rows.findIndex((row) => {
    return row.key === activeKey
  })

  const { virtualizer, attachScrollElement } = useListVirtualizer({
    count: rows.length,
    rowHeight,
  })

  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, rowHeight])

  useEffect(() => {
    if (reveal.current.key !== activeKey) {
      reveal.current = { key: activeKey, pending: activeKey !== null }
    }
    if (reveal.current.pending && activeIndex >= 0) {
      virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
      reveal.current.pending = false
    }
  }, [virtualizer, activeKey, activeIndex])

  const rowId = (key: string) => {
    return `${treeId}-${encodeURIComponent(key)}`
  }

  const items = virtualizer.getVirtualItems()
  const first = items.at(0)
  const last = items.at(-1)
  let activeDescendant: string | undefined
  if (activeKey !== null && first !== undefined && last !== undefined) {
    if (activeIndex >= first.index && activeIndex <= last.index) {
      activeDescendant = rowId(activeKey)
    }
  }

  return {
    attachScrollElement,
    rowId,
    activeIndex,
    activeDescendant,
    totalSize: virtualizer.getTotalSize(),
    virtualRows: items.map((item) => {
      return { row: rows[item.index], start: item.start, position: positions[item.index] }
    }),
  }
}

export type ScrollElementRef = ReturnType<typeof useTreeVirtualizer>['attachScrollElement']
