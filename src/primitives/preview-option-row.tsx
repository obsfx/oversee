import { VscCheck } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

interface PreviewOptionRowProps {
  label: string
  selected: boolean
  onSelect: () => void
  onPreview: () => void
}

export function PreviewOptionRow({ label, selected, onSelect, onPreview }: PreviewOptionRowProps) {
  return (
    <button
      type={'button'}
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className={c(
        'flex h-6 w-full cursor-pointer items-center gap-1.5 rounded px-1.5 text-left outline-none',
        'hover:bg-surface-hover focus-visible:bg-surface-hover',
        selected && 'bg-surface-active',
      )}
    >
      <span className={'flex-1 truncate'}>{label}</span>
      {selected && <VscCheck className={'shrink-0'} />}
    </button>
  )
}
