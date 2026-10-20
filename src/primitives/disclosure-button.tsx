import type { ReactNode } from 'react'
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc'

interface DisclosureButtonProps {
  expanded: boolean
  onClick: () => void
  children: ReactNode
}

export function DisclosureButton({ expanded, onClick, children }: DisclosureButtonProps) {
  const Chevron = expanded ? VscChevronDown : VscChevronRight

  return (
    <button
      type={'button'}
      aria-expanded={expanded}
      onClick={onClick}
      className={
        'flex min-w-0 cursor-pointer items-center gap-0.5 rounded-sm outline-none hover:underline focus-visible:ring-1 focus-visible:ring-fg-faint'
      }
    >
      <Chevron className={'shrink-0'} />
      <span className={'truncate'}>{children}</span>
    </button>
  )
}
