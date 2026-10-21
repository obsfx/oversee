import type { KeyboardEvent, ReactNode, Ref } from 'react'

interface TabStripProps {
  label: string
  pinned: ReactNode
  scrollerRef?: Ref<HTMLDivElement>
  fadeMask?: string
  controls?: ReactNode
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  children: ReactNode
}

export function TabStrip({
  label,
  pinned,
  scrollerRef,
  fadeMask,
  controls,
  onKeyDown,
  children,
}: TabStripProps) {
  return (
    <div
      className={'flex h-7 shrink-0 items-stretch border-b border-line bg-surface-subtle text-xs'}
    >
      <div
        role={'tablist'}
        aria-label={label}
        onKeyDown={onKeyDown}
        className={'flex min-w-0 flex-1 items-stretch'}
      >
        {pinned}
        <div
          ref={scrollerRef}
          style={{ maskImage: fadeMask }}
          className={'flex min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto'}
        >
          {children}
        </div>
      </div>
      {controls && (
        <div className={'flex shrink-0 items-center gap-0.5 border-l border-line px-0.5'}>
          {controls}
        </div>
      )}
    </div>
  )
}
