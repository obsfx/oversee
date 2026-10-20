import type { ReactNode } from 'react'

export function Footnote({ children }: { children: ReactNode }) {
  return <span className={'text-mini text-fg-faint'}>{children}</span>
}
