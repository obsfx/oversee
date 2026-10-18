import { Separator } from 'react-resizable-panels'

export function ResizeHandle() {
  return (
    <Separator
      className={
        'w-1.5 shrink-0 border-r border-line bg-sidebar transition-colors outline-none hover:border-fg-faint focus-visible:border-accent data-[separator=active]:border-accent'
      }
    />
  )
}
