import type { ReactNode } from 'react'
import { VscReply } from 'react-icons/vsc'
import { c } from '@/src/c.ts'
import type { ReadingSize } from '@/src/lib/comment-reader-rules.ts'

interface ReplyEntryProps {
  author: string
  age: string
  body: ReactNode
  size?: ReadingSize
}

export function ReplyEntry({ author, age, body, size = 'compact' }: ReplyEntryProps) {
  return (
    <div
      className={c('flex flex-col', size === 'compact' && 'gap-0.5', size === 'reader' && 'gap-1')}
    >
      <span
        className={c(
          'flex items-center gap-1 text-fg-muted',
          size === 'compact' && 'text-mini',
          size === 'reader' && 'text-xs',
        )}
      >
        <VscReply className={'text-accent'} />
        <span className={'font-medium text-fg'}>{author}</span>
        <span className={'text-fg-faint'}>{age}</span>
      </span>
      <div>{body}</div>
    </div>
  )
}
