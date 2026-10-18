import type { ReactNode } from 'react'

export function PopoverScrollArea({ children }: { children: ReactNode }) {
  return <div className={'max-h-96 overflow-auto overscroll-contain p-1'}>{children}</div>
}
