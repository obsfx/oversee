import type { ReactNode } from 'react'

export function OptionList({ children }: { children: ReactNode }) {
  return <div className={'max-h-64 overflow-auto overscroll-contain px-1 pb-1'}>{children}</div>
}
