import type { IconType } from 'react-icons'
import { VscCheck } from 'react-icons/vsc'
import { c } from '../c.ts'

interface OptionRowProps {
  icon: IconType
  label: string
  selected: boolean
  onSelect: () => void
}

export function OptionRow({ icon: Icon, label, selected, onSelect }: OptionRowProps) {
  return (
    <button
      type={'button'}
      onClick={onSelect}
      className={c(
        'flex h-6 w-full cursor-pointer items-center gap-1.5 rounded px-1.5 text-left outline-none',
        'hover:bg-surface-hover focus-visible:bg-surface-hover',
        selected && 'bg-surface-hover',
      )}
    >
      <Icon className={'shrink-0 text-fg-muted'} />
      <span className={'flex-1 truncate'}>{label}</span>
      {selected && <VscCheck className={'shrink-0'} />}
    </button>
  )
}
