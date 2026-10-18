import type { ReactNode } from 'react'
import { VscSearch } from 'react-icons/vsc'

export function FilterField({ children }: { children: ReactNode }) {
  return (
    <label
      className={
        'flex h-7 min-w-0 flex-1 items-center gap-1.5 px-2 text-sidebar-muted focus-within:text-sidebar-fg'
      }
    >
      <VscSearch className={'shrink-0 opacity-70'} />
      {children}
    </label>
  )
}
