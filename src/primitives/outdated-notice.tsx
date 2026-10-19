import { VscChevronRight, VscHistory } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

interface OutdatedNoticeProps {
  title: string
  description: string
  onSelect: () => void
}

export function OutdatedNotice({ title, description, onSelect }: OutdatedNoticeProps) {
  return (
    <button
      type={'button'}
      onClick={onSelect}
      className={c(
        'mb-1 flex w-full cursor-pointer items-center gap-1.5 rounded border border-status-modified/30 bg-status-modified/8 px-1.5 py-1 text-left outline-none',
        'hover:bg-status-modified/14 focus-visible:bg-status-modified/14',
      )}
    >
      <span className={'min-w-0 flex-1'}>
        <span className={'flex items-center gap-1.5 font-medium'}>
          <VscHistory className={'size-4 shrink-0 text-status-modified'} />
          {title}
        </span>
        <span className={'block pl-5.5 text-mini text-fg-muted'}>{description}</span>
      </span>
      <VscChevronRight className={'shrink-0 text-fg-faint'} />
    </button>
  )
}
