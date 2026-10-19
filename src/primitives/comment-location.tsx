import type { ReactNode } from 'react'

interface CommentLocationProps {
  filePath: string
  location: string
  children?: ReactNode
}

export function CommentLocation({ filePath, location, children }: CommentLocationProps) {
  return (
    <span className={'flex items-center gap-1.5 text-mini text-fg-muted'}>
      <span className={'truncate'}>{filePath}</span>
      <span className={'shrink-0 font-editor text-fg-faint'}>{location}</span>
      {children}
    </span>
  )
}
