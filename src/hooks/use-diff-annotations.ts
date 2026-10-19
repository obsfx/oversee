import type { SelectedLineRange } from '@pierre/diffs/react'
import { CommentAnnotations } from '@/src/lib/comment-annotations.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useComments } from '@/src/hooks/use-comments.ts'

export const useDiffAnnotations = (path: string) => {
  const { live } = useComments()
  const selection = useAnnotationStore((store) => {
    return store.selection
  })
  const selecting = useAnnotationStore((store) => {
    return store.selecting
  })
  const draft = useAnnotationStore((store) => {
    return store.draft
  })

  const fileComments = live.filter((comment) => {
    return comment.filePath === path
  })
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
