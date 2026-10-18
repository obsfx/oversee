import type { ReactNode } from 'react'
import { VscSearch } from 'react-icons/vsc'

export function SearchField({ children }: { children: ReactNode }) {
  return (
    <label className={'m-1.5 flex h-6 items-center gap-1.5 rounded border border-line px-1.5'}>
      <VscSearch className={'shrink-0 text-fg-faint'} />
      {children}
    </label>
  )
}
