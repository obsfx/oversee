import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { CommentLabels } from '@/src/lib/comment-labels.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { useCommentLocationOpener } from '@/src/hooks/use-comment-location-opener.ts'
import { useDeleteComment } from '@/src/hooks/use-delete-comment.ts'
import { useNow } from '@/src/hooks/use-now.ts'

export const useOutdatedComment = (comment: ReviewComment, onNavigate: () => void) => {
  const now = useNow()
  const { remove, removing, failed } = useDeleteComment(comment.id)
  const openLocation = useCommentLocationOpener(onNavigate)

  return {
    location: LineRanges.shortLabel(comment.range),
    age: CommentLabels.outdatedAge(comment.outdatedAt ?? now, now),
    remove,
    removing,
    failed,
    openFile: () => {
      openLocation(comment)
    },
  }
}
