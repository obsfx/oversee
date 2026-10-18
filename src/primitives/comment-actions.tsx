import type { ReactNode } from 'react'

export function CommentActions({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-focus-within/note:opacity-100 group-hover/note:opacity-100'
      }
    >
      {children}
    </div>
  )
}
