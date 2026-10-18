import { useState } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { RelativeTime } from '@/src/lib/relative-time.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useAsyncAction } from '@/src/hooks/use-async-action.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'

export const useCommentItem = (comment: ReviewComment) => {
  const { comments } = useServices()
  const { comparison } = useComparison()
  const openDraft = useAnnotationStore((state) => {
    return state.openDraft
  })
  const [now] = useState(Date.now)

  const edit = () => {
    openDraft({ path: comment.filePath, range: comment.range, commentId: comment.id })
  }

  const remove = useAsyncAction(async () => {
    if (comparison) {
      await comments.remove(comparison, comment.id)
    }
  })

  const meta = [LineRanges.label(comment.range), RelativeTime.format(comment.createdAt, now)]
  if (comment.updatedAt > comment.createdAt) {
    meta.push('edited')
  }

  return {
    edit,
    remove: () => {
      void remove.run()
    },
    removing: remove.pending,
    failed: remove.failed,
    meta,
  }
}
