import { Combobox } from '@base-ui/react/combobox'
import { useImperativeHandle, type RefObject } from 'react'
import type { ListVirtualizer } from '@/src/hooks/use-virtualized-combobox.ts'
import { useListVirtualizer } from '@/src/hooks/use-list-virtualizer.ts'

const ROW_HEIGHT = 24

export const useComboboxListVirtualizer = (
  open: boolean,
  virtualizerRef: RefObject<ListVirtualizer | null>,
) => {
  'use no memo'
  const items = Combobox.useFilteredItems<string>()
  const { virtualizer, attachScrollElement } = useListVirtualizer({
    count: items.length,
    rowHeight: ROW_HEIGHT,
    enabled: open,
  })

  useImperativeHandle(virtualizerRef, () => {
    return virtualizer
  })

  return { items, virtualizer, attachScrollElement }
}
