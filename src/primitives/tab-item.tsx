import type { ReactNode } from 'react'
import { VscClose } from 'react-icons/vsc'
import { c } from '@/src/c.ts'

interface TabItemProps {
  active: boolean
  icon: ReactNode
  title: string
  label?: string
  titleTail?: string
  hint?: string
  tooltip?: string
  italic?: boolean
  closeLabel?: string
  onSelect: () => void
  onClose?: () => void
}

export function TabItem({
  active,
  icon,
  title,
  label,
  titleTail,
  hint,
  tooltip,
  italic = false,
  closeLabel,
  onSelect,
  onClose,
}: TabItemProps) {
  return (
    <div
      role={'tab'}
      aria-selected={active}
      aria-label={label}
      aria-keyshortcuts={onClose ? 'Delete' : undefined}
      tabIndex={active ? 0 : -1}
      title={tooltip}
      onClick={onSelect}
      className={c(
        'group flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-line pl-2 outline-none focus-visible:underline',
        !onClose && 'pr-2',
        active ? 'bg-surface text-fg' : 'text-fg-muted hover:text-fg',
      )}
    >
      <span className={'flex shrink-0'}>{icon}</span>
      <span className={c('flex max-w-48 min-w-0', italic && 'italic')}>
        <span className={'truncate'}>{title}</span>
        {titleTail && <span className={'shrink-0'}>{titleTail}</span>}
      </span>
      {hint && <span className={'max-w-32 shrink-0 truncate text-fg-faint'}>{hint}</span>}
      {onClose && (
        <button
          type={'button'}
          tabIndex={-1}
          aria-label={closeLabel}
          title={closeLabel}
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          className={c(
            'mr-1 flex size-4 cursor-pointer items-center justify-center rounded-sm outline-none hover:bg-surface-hover',
            !active && 'opacity-0 group-hover:opacity-100',
          )}
        >
          <VscClose />
        </button>
      )}
    </div>
  )
}
