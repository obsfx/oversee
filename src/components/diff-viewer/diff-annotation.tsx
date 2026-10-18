import type { DiffAnnotationMeta } from '@/src/lib/comment-annotations.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { CommentComposer } from '@/src/components/diff-viewer/comment-composer.tsx'
import { CommentThread } from '@/src/components/diff-viewer/comment-thread.tsx'
import { SelectionActions } from '@/src/components/diff-viewer/selection-actions.tsx'

interface DiffAnnotationProps {
  path: string
  meta: DiffAnnotationMeta
}

export function DiffAnnotation({ path, meta }: DiffAnnotationProps) {
  if (meta.kind === 'comments') {
    return <CommentThread comments={meta.comments} />
  }
  if (meta.kind === 'selection') {
    return <SelectionActions path={path} range={meta.range} />
  }
  return (
    <CommentComposer
      key={`${meta.comment?.id ?? 'new'}:${LineRanges.label(meta.range)}`}
      path={path}
      range={meta.range}
      comment={meta.comment}
    />
  )
}
