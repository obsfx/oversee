import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'
import type { ReadingSize } from '@/src/lib/comment-reader-rules.ts'

interface CommentLocationProps {
  filePath: string
  location: string
  size?: ReadingSize
  onOpen?: () => void
  children?: ReactNode
}

export function CommentLocation({
  filePath,
  location,
  size = 'compact',
  onOpen,
  children,
}: CommentLocationProps) {
  let place = (
    <>
      <span className={'truncate'}>{filePath}</span>
      <span className={'shrink-0 font-editor text-fg-faint'}>{location}</span>
    </>
  )
  if (onOpen) {
    place = (
      <button
        type={'button'}
        title={`Open ${filePath} at ${location}`}
        onClick={onOpen}
        className={c(
          'flex min-w-0 cursor-pointer items-center gap-1.5 text-left outline-none',
          'underline-offset-2 hover:text-fg hover:underline',
          'focus-visible:text-fg focus-visible:underline',
        )}
      >
        {place}
      </button>
    )
  }
  return (
    <span
      className={c(
        'flex items-center gap-1.5 text-fg-muted',
        size === 'compact' && 'text-mini',
        size === 'reader' && 'text-sm',
      )}
    >
      {place}
      {children}
    </span>
  )
}
