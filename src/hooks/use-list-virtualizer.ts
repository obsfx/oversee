import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useRef } from 'react'

const OVERSCAN = 20
const PADDING = 4

interface ListVirtualizerOptions {
  count: number
  rowHeight: number
  enabled?: boolean
}

export const useListVirtualizer = ({
  count,
  rowHeight,
  enabled = true,
}: ListVirtualizerOptions) => {
  'use no memo'
  const scrollElementRef = useRef<HTMLDivElement | null>(null)

  const virtualizer = useVirtualizer({
    enabled,
    count,
    getScrollElement: () => {
      return scrollElementRef.current
    },
    estimateSize: () => {
      return rowHeight
    },
    overscan: OVERSCAN,
    paddingStart: PADDING,
    paddingEnd: PADDING,
    scrollPaddingStart: PADDING,
    scrollPaddingEnd: PADDING,
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

  return { virtualizer, attachScrollElement }
}
