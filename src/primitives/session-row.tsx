import type { ReactNode } from 'react'

interface SessionRowProps {
  onSelect: () => void
  children: ReactNode
}

export function SessionRow({ onSelect, children }: SessionRowProps) {
  return (
    <button
      type={'button'}
      onClick={onSelect}
      className={
        'flex w-full cursor-pointer rounded px-1.5 py-1 outline-none hover:bg-surface-hover focus-visible:bg-surface-hover'
      }
    >
      {children}
    </button>
  )
}
