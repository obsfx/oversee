import { useState } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { LineRanges, type LineRange } from '@/src/lib/line-range.ts'
import { useAnnotationStore } from '@/src/store/annotation-store.ts'
import { useCommentEditor } from '@/src/hooks/use-comment-editor.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'

type SaveStatus = 'idle' | 'saving' | 'failed'

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
  const [status, setStatus] = useState<SaveStatus>('idle')

  const save = async (body: string) => {
    if (!comparison || status === 'saving') {
      return
    }
    setStatus('saving')
    try {
      if (comment) {
        await comments.update(comparison, comment.id, body)
      } else {
        await comments.create(comparison, { filePath: path, range, body })
      }
      closeDraft()
    } catch {
      setStatus('failed')
    }
  }

  const { editor, isEmpty, submit } = useCommentEditor({
    initialBody: comment?.body ?? '',
    placeholder: 'Leave a comment. Markdown shortcuts work as you type.',
    onSubmit: (body) => {
      void save(body)
    },
    onCancel: closeDraft,
    className: 'comment-prose min-h-12 max-h-64 overflow-y-auto px-2 py-1.5',
  })

  const idleLabel = comment ? 'Save' : 'Comment'

  return {
    editor,
    submit,
    cancel: closeDraft,
    canSubmit: !isEmpty && status !== 'saving',
    failed: status === 'failed',
    submitLabel: status === 'saving' ? 'Saving' : idleLabel,
    label: LineRanges.label(range),
  }
}
