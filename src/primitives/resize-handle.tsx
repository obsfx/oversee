import { Separator } from 'react-resizable-panels'

export function ResizeHandle() {
  return (
    <Separator
      className={
        'w-px bg-line outline-none hover:bg-fg-faint focus-visible:bg-accent data-[separator=active]:bg-accent'
      }
    />
  )
}
