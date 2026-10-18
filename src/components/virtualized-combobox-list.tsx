import type { CSSProperties, RefObject } from 'react'
import { useComboboxListVirtualizer } from '../hooks/use-combobox-list-virtualizer.ts'
import type { ListVirtualizer } from '../hooks/use-virtualized-combobox.ts'
import { ComboboxOption } from '../primitives/combobox-option.tsx'

interface VirtualizedComboboxListProps {
  open: boolean
  virtualizerRef: RefObject<ListVirtualizer | null>
}

export function VirtualizedComboboxList({ open, virtualizerRef }: VirtualizedComboboxListProps) {
  'use no memo'
  const { items, virtualizer, attachScrollElement } = useComboboxListVirtualizer(
    open,
    virtualizerRef,
  )
  const totalSize = virtualizer.getTotalSize()

  if (items.length === 0) {
    return null
  }

  return (
    <div
      role={'presentation'}
      ref={attachScrollElement}
      className={'h-[min(16rem,var(--total-size))] overflow-auto overscroll-contain px-1'}
      style={{ '--total-size': `${totalSize}px` } as CSSProperties}
    >
      <div role={'presentation'} className={'relative w-full'} style={{ height: totalSize }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index]
          return (
            <ComboboxOption
              key={virtualItem.key}
              index={virtualItem.index}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              value={item}
              aria-setsize={items.length}
              aria-posinset={virtualItem.index + 1}
              className={'absolute top-0 left-0 w-full'}
              style={{ height: virtualItem.size, transform: `translateY(${virtualItem.start}px)` }}
            />
          )
        })}
      </div>
    </div>
  )
}
