import type { ReactNode } from 'react'

interface SessionCommentProps {
  filePath: string
  location: string
  snippet: ReactNode
  body: string
}

export function SessionComment({ filePath, location, snippet, body }: SessionCommentProps) {
  return (
    <div className={'flex flex-col gap-1 px-1.5 py-1.5'}>
      <span className={'flex items-center gap-1.5 text-mini text-fg-muted'}>
        <span className={'truncate'}>{filePath}</span>
        <span className={'shrink-0 font-editor text-fg-faint'}>{location}</span>
      </span>
      {snippet}
      <span className={'block'}>{body}</span>
    </div>
  )
}
