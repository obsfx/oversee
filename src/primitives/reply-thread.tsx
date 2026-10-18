import type { ReactNode } from 'react'

export function ReplyThread({ children }: { children: ReactNode }) {
  return <div className={'flex flex-col gap-1 border-l-2 border-accent/40 pl-2'}>{children}</div>
}
