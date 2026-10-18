import type { ReactNode } from 'react'

export function SegmentedControl({ children }: { children: ReactNode }) {
  return <div className={'flex rounded border border-line p-0.5 text-[11px]'}>{children}</div>
}
