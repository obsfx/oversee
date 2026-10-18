import { VscChevronRight } from 'react-icons/vsc'

interface SummaryRowProps {
  label: string
  summary: string
  onOpen: () => void
}

export function SummaryRow({ label, summary, onOpen }: SummaryRowProps) {
  return (
    <button
      type={'button'}
      onClick={onOpen}
      title={summary}
      className={
        'flex h-7 w-full cursor-pointer items-center gap-2 rounded px-1.5 text-left outline-none hover:bg-surface-hover focus-visible:bg-surface-hover'
      }
    >
      <span className={'shrink-0'}>{label}</span>
      <span className={'min-w-0 flex-1 truncate text-right text-fg-muted'}>{summary}</span>
      <VscChevronRight className={'shrink-0 text-fg-faint'} />
    </button>
  )
}
