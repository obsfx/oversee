import type { ReactNode } from 'react'
import { c } from '@/src/c.ts'
import { CommentLocation } from '@/src/primitives/comment-location.tsx'

interface SessionCommentProps {
  filePath: string
  location: string
  marker?: ReactNode
  dimmed?: boolean
  snippet: ReactNode
  body: ReactNode
  replies?: ReactNode
}

export function SessionComment({
  filePath,
  location,
  marker,
  dimmed = false,
  snippet,
  body,
  replies,
}: SessionCommentProps) {
  return (
    <div className={c('flex flex-col gap-1 px-1.5 py-1.5', dimmed && 'opacity-70')}>
      <CommentLocation filePath={filePath} location={location}>
        {marker}
      </CommentLocation>
      {snippet}
      <div>{body}</div>
      {replies}
    </div>
  )
}
