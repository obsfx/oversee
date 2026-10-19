import { ResourceStates } from '@/src/lib/async-resource.ts'
import { ChangeSets } from '@/src/lib/change-set.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { CommentLabels } from '@/src/lib/comment-labels.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { useDeleteComment } from '@/src/hooks/use-delete-comment.ts'
import { useNow } from '@/src/hooks/use-now.ts'

export const useOutdatedComment = (comment: ReviewComment, onNavigate: () => void) => {
  const { state: changeSetState } = useChangeSet()
  const changes = ResourceStates.dataOr(changeSetState, ChangeSets.empty).changes
  const selectFile = useNavigationStore((navigation) => {
    return navigation.selectFile
  })
  const now = useNow()
  const { remove, removing, failed } = useDeleteComment(comment.id)

  return {
    location: LineRanges.shortLabel(comment.range),
    age: CommentLabels.outdatedAge(comment.outdatedAt ?? now, now),
    remove,
    removing,
    failed,
    canOpenFile: ChangeSets.find(changes, comment.filePath) !== null,
    openFile: () => {
      selectFile(comment.filePath)
      onNavigate()
    },
  }
}
