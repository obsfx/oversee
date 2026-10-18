import type { ReactNode } from 'react'

export function OptionGroupLabel({ children }: { children: ReactNode }) {
  return <div className={'px-1.5 pt-1.5 pb-0.5 text-mini text-fg-faint uppercase'}>{children}</div>
}
