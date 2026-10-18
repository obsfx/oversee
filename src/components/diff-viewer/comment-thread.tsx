import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { CommentCard } from '@/src/primitives/comment-card.tsx'
import { CommentItem } from '@/src/components/diff-viewer/comment-item.tsx'

export function CommentThread({ comments }: { comments: ReviewComment[] }) {
  return (
    <CommentCard variant={'note'}>
      {comments.map((comment) => {
        return <CommentItem key={comment.id} comment={comment} />
      })}
    </CommentCard>
  )
}
