import { useState } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import { type ReviewComment, StaleCommentError } from '@/src/lib/comment-gateway.ts'
import { CommentSnapshots } from '@/src/lib/comment-snapshots.ts'
import { LineRanges, type LineRange } from '@/src/lib/line-range.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useAsyncAction } from '@/src/hooks/use-async-action.ts'
import { useCommentEditor } from '@/src/hooks/use-comment-editor.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { useFileDiff } from '@/src/hooks/use-file-diff.ts'

interface CommentComposerOptions {
  path: string
  range: LineRange
  comment: ReviewComment | null
}

export const useCommentComposer = ({ path, range, comment }: CommentComposerOptions) => {
  const { comments } = useServices()
  const { comparison } = useComparison()
  const { change, shown, refresh } = useFileDiff()
  const closeDraft = useAnnotationStore((state) => {
    return state.closeDraft
  })
  const [stale, setStale] = useState(false)
  const expectedLines =
    shown?.path === path ? CommentSnapshots.expectedLines(shown.diff, range) : undefined
  const save = useAsyncAction(async (body: string) => {
    if (!comparison) {
      return
    }
    setStale(false)
    try {
      if (comment) {
        await comments.update(comparison, comment.id, body)
      } else {
        await comments.create(comparison, {
          filePath: path,
          previousPath: change?.previousPath,
          range,
          body,
          expectedLines,
        })
      }
    } catch (error) {
      if (error instanceof StaleCommentError) {
        setStale(true)
        refresh()
      }
      throw error
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
  let error: string | null = null
  if (save.failed) {
    error = 'Could not save the comment. Try again.'
  }
  if (save.failed && stale) {
    error = 'The file changed after it loaded. Check the lines and send again.'
  }

  return {
    editor,
    submit,
    cancel: closeDraft,
    canSubmit: !isEmpty && !save.pending,
    error,
    submitLabel: save.pending ? 'Saving' : idleLabel,
    label: LineRanges.label(range),
  }
}
