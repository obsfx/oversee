import type { ReactNode } from 'react'

export function AnnotationRow({ children }: { children: ReactNode }) {
  return <div className={'flex items-center gap-1 px-2 py-1 font-ui text-xs'}>{children}</div>
}
