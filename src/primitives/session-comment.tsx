import type { ReactNode, Ref } from 'react'
import { c } from '@/src/c.ts'
import { CommentLocation } from '@/src/primitives/comment-location.tsx'

interface SessionCommentProps {
  ref?: Ref<HTMLDivElement>
  filePath: string
  location: string
  marker?: ReactNode
  dimmed?: boolean
  highlighted?: boolean
  snippet: ReactNode
  body: ReactNode
  replies?: ReactNode
  onOpenFile?: () => void
  onAnimationEnd?: () => void
}

export function SessionComment({
  ref,
  filePath,
  location,
  marker,
  dimmed = false,
  highlighted = false,
  snippet,
  body,
  replies,
  onOpenFile,
  onAnimationEnd,
}: SessionCommentProps) {
  return (
    <div
      ref={ref}
      data-highlighted={highlighted || undefined}
      onAnimationEnd={onAnimationEnd}
      className={c(
        'relative flex flex-col gap-1 px-1.5 py-1.5',
        dimmed && 'opacity-70',
        highlighted &&
          'after:pointer-events-none after:absolute after:inset-0 after:animate-highlight-ring after:rounded-[inherit] after:shadow-[inset_0_0_0_1.5px_var(--color-accent)]',
      )}
    >
      <CommentLocation filePath={filePath} location={location} onOpen={onOpenFile}>
        {marker}
      </CommentLocation>
      {snippet}
      <div>{body}</div>
      {replies}
    </div>
  )
}
