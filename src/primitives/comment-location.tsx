import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'

interface CommentLocationProps {
  filePath: string
  location: string
  onOpen?: () => void
  children?: ReactNode
}

export function CommentLocation({ filePath, location, onOpen, children }: CommentLocationProps) {
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
    <span className={'flex items-center gap-1.5 text-mini text-fg-muted'}>
      {place}
      {children}
    </span>
  )
}
