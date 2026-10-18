import type { SelectedLineRange } from '@pierre/diffs/react'
import { useServices } from '@/src/context/services/use-services.ts'
import { CommentAnnotations } from '@/src/lib/comment-annotations.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { useResource } from '@/src/hooks/use-resource.ts'

export const useDiffAnnotations = (path: string) => {
  const { comments } = useServices()
  const { comparison } = useComparison()
  const state = useResource(comparison ? comments.of(comparison) : null)
  const selection = useAnnotationStore((store) => {
    return store.selection
  })
  const selecting = useAnnotationStore((store) => {
    return store.selecting
  })
  const draft = useAnnotationStore((store) => {
    return store.draft
  })

  let fileComments: ReviewComment[] = []
  if (state.status === 'ready') {
    fileComments = state.data.filter((comment) => {
      return comment.filePath === path
    })
  }
  const composer = draft?.path === path ? draft : null
  const fileSelection = selection?.path === path ? selection.range : null
  const annotations = CommentAnnotations.build({
    comments: fileComments,
    composer,
    selection: selecting || composer ? null : fileSelection,
  })
  const selectedLines: SelectedLineRange | null = composer?.range ?? fileSelection

  return { annotations, selectedLines }
}
