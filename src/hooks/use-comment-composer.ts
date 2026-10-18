import { useServices } from '@/src/context/services/use-services.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { LineRanges, type LineRange } from '@/src/lib/line-range.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useAsyncAction } from '@/src/hooks/use-async-action.ts'
import { useCommentEditor } from '@/src/hooks/use-comment-editor.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'

interface CommentComposerOptions {
  path: string
  range: LineRange
  comment: ReviewComment | null
}

export const useCommentComposer = ({ path, range, comment }: CommentComposerOptions) => {
  const { comments } = useServices()
  const { comparison } = useComparison()
  const closeDraft = useAnnotationStore((state) => {
    return state.closeDraft
  })
  const save = useAsyncAction(async (body: string) => {
    if (!comparison) {
      return
    }
    if (comment) {
      await comments.update(comparison, comment.id, body)
    } else {
      await comments.create(comparison, { filePath: path, range, body })
    }
    closeDraft()
  })

  const { editor, isEmpty, submit } = useCommentEditor({
    initialBody: comment?.body ?? '',
    placeholder: 'Leave a comment. Markdown shortcuts work as you type.',
    onSubmit: (body) => {
      void save.run(body)
    },
    onCancel: closeDraft,
    className: 'comment-prose min-h-12 max-h-64 overflow-y-auto px-2 py-1.5',
  })

  const idleLabel = comment ? 'Save' : 'Comment'

  return {
    editor,
    submit,
    cancel: closeDraft,
    canSubmit: !isEmpty && !save.pending,
    failed: save.failed,
    submitLabel: save.pending ? 'Saving' : idleLabel,
    label: LineRanges.label(range),
  }
}
