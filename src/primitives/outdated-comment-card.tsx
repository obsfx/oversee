import type { ReactNode } from 'react'
import { CommentLocation } from '@/src/primitives/comment-location.tsx'

interface OutdatedCommentCardProps {
  filePath: string
  location: string
  age: string
  snippet: ReactNode
  body: ReactNode
  error?: string
  actions: ReactNode
}

export function OutdatedCommentCard({
  filePath,
  location,
  age,
  snippet,
  body,
  error,
  actions,
}: OutdatedCommentCardProps) {
  return (
    <div className={'flex flex-col gap-1 px-1.5 py-1.5'}>
      <CommentLocation filePath={filePath} location={location}>
        <span className={'ml-auto shrink-0 text-fg-faint'}>{age}</span>
      </CommentLocation>
      {snippet}
      <div>{body}</div>
      {error && <p className={'text-micro text-danger'}>{error}</p>}
      <div className={'flex justify-end gap-1'}>{actions}</div>
    </div>
  )
}
