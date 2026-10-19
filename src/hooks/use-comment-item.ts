import { useNow } from '@/src/hooks/use-now.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { RelativeTime } from '@/src/lib/relative-time.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useDeleteComment } from '@/src/hooks/use-delete-comment.ts'

export const useCommentItem = (comment: ReviewComment) => {
  const openDraft = useAnnotationStore((state) => {
    return state.openDraft
  })
  const now = useNow()

  const edit = () => {
    openDraft({ path: comment.filePath, range: comment.range, commentId: comment.id })
  }

  const { remove, removing, failed } = useDeleteComment(comment.id)

  const meta = [LineRanges.label(comment.range), RelativeTime.format(comment.createdAt, now)]
  if (comment.updatedAt > comment.createdAt) {
    meta.push('edited')
  }

  return {
    edit,
    remove,
    removing,
    failed,
    meta,
  }
}
