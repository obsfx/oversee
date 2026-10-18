import type { Virtualizer } from '@tanstack/react-virtual'
import { useRef, useState } from 'react'

export type ListVirtualizer = Virtualizer<HTMLDivElement, Element>

interface HighlightDetails {
  reason: string
  index: number
}

export const useVirtualizedCombobox = () => {
  const [open, setOpen] = useState(false)
  const virtualizerRef = useRef<ListVirtualizer | null>(null)

  const handleItemHighlighted = (item: unknown, { reason, index }: HighlightDetails) => {
    const virtualizer = virtualizerRef.current
    if (!item || !virtualizer) {
      return
    }
    const isStart = index === 0
    const isEnd = index === virtualizer.options.count - 1
    const shouldScroll = reason === 'none' || (reason === 'keyboard' && (isStart || isEnd))
    if (shouldScroll) {
      queueMicrotask(() => {
        virtualizer.scrollToIndex(index, { align: isEnd ? 'start' : 'end' })
      })
    }
  }

  return { open, setOpen, virtualizerRef, handleItemHighlighted }
}
