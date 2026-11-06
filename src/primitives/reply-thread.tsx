import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'
import type { ReadingSize } from '@/src/lib/comment-reader-rules.ts'

interface ReplyThreadProps {
  size?: ReadingSize
  children: ReactNode
}

export function ReplyThread({ size = 'compact', children }: ReplyThreadProps) {
  return (
    <div
      className={c(
        'flex flex-col border-l-2 border-accent/40',
        size === 'compact' && 'gap-1 pl-2',
        size === 'reader' && 'gap-4 pl-3',
      )}
    >
      {children}
    </div>
  )
}
