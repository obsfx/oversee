import { VscEdit, VscTrash } from 'react-icons/vsc'
import { useCommentHighlight } from '@/src/hooks/use-comment-highlight.ts'
import { useCommentItem } from '@/src/hooks/use-comment-item.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { CommentActionButton } from '@/src/primitives/comment-action-button.tsx'
import { CommentActions } from '@/src/primitives/comment-actions.tsx'
import { CommentEntry } from '@/src/primitives/comment-entry.tsx'
import { CommentMeta } from '@/src/primitives/comment-meta.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { MarkdownView } from '@/src/components/diff-viewer/markdown-view.tsx'

export function CommentItem({ comment }: { comment: ReviewComment }) {
  const { edit, remove, removing, failed, meta } = useCommentItem(comment)
  const { highlightKey, endHighlight } = useCommentHighlight(comment.id)

  return (
    <CommentEntry
      key={highlightKey ?? 'idle'}
      id={DiffSurface.commentElementId(comment.id)}
      aria-busy={removing}
      highlighted={highlightKey !== null}
      onAnimationEnd={endHighlight}
    >
      <div className={'pr-16'}>
        <MarkdownView body={comment.body} />
      </div>
      <CommentMeta items={meta} />
      {failed && <p className={'pt-1 text-micro text-danger'}>Could not delete the comment.</p>}
      <CommentActions>
        <Tooltip label={'Edit comment'}>
          <CommentActionButton aria-label={'Edit comment'} onClick={edit}>
            <VscEdit />
          </CommentActionButton>
        </Tooltip>
        <Tooltip label={'Delete comment'}>
          <CommentActionButton aria-label={'Delete comment'} disabled={removing} onClick={remove}>
            <VscTrash />
          </CommentActionButton>
        </Tooltip>
      </CommentActions>
    </CommentEntry>
  )
}
