import { Combobox } from '@base-ui/react/combobox'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useImperativeHandle, useRef, type RefObject } from 'react'
import type { ListVirtualizer } from './use-virtualized-combobox.ts'

const ROW_HEIGHT = 24
const OVERSCAN = 20

export const useComboboxListVirtualizer = (
  open: boolean,
  virtualizerRef: RefObject<ListVirtualizer | null>,
) => {
  'use no memo'
  const items = Combobox.useFilteredItems<string>()
  const scrollElementRef = useRef<HTMLDivElement | null>(null)

  const virtualizer = useVirtualizer({
    enabled: open,
    count: items.length,
    getScrollElement: () => {
      return scrollElementRef.current
    },
    estimateSize: () => {
      return ROW_HEIGHT
    },
    overscan: OVERSCAN,
    paddingStart: 4,
    paddingEnd: 4,
    scrollPaddingStart: 4,
    scrollPaddingEnd: 4,
  })

  useImperativeHandle(virtualizerRef, () => {
    return virtualizer
  })

  const attachScrollElement = useCallback(
    (element: HTMLDivElement | null) => {
      scrollElementRef.current = element
      if (element) {
        virtualizer.measure()
      }
    },
    [virtualizer],
  )

  return { items, virtualizer, attachScrollElement }
}
