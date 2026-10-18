import { Separator } from 'react-resizable-panels'

export function ResizeHandle() {
  return (
    <Separator
      className={
        'relative z-10 -mr-1.5 w-1.5 shrink-0 border-l border-line bg-transparent transition-colors outline-none hover:border-fg-faint focus-visible:border-accent data-[separator=active]:border-accent'
      }
    />
  )
}
