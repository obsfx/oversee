import { VscChevronRight } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

interface TreeTwistyProps {
  expandable: boolean
  expanded: boolean
  onToggle: () => void
}

export function TreeTwisty({ expandable, expanded, onToggle }: TreeTwistyProps) {
  if (!expandable) {
    return <span aria-hidden={true} className={'size-3.5 shrink-0'} />
  }
  return (
    <span
      aria-hidden={true}
      className={'flex size-3.5 shrink-0 items-center justify-center text-sidebar-muted'}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      <VscChevronRight
        className={c(
          'size-3.5 transition-[rotate] duration-125 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'motion-reduce:transition-none',
          expanded && 'rotate-90',
        )}
      />
    </span>
  )
}
