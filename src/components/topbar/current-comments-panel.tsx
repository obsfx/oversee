import { VscComment } from 'react-icons/vsc'
import { useComments } from '@/src/hooks/use-comments.ts'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { CommentRow } from '@/src/primitives/comment-row.tsx'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { PopoverEmptyState } from '@/src/primitives/popover-empty-state.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'

export function CurrentCommentsPanel({ onNavigate }: { onNavigate: () => void }) {
  const { state, list, focusComment } = useComments()

  return (
    <PopoverScrollArea>
      {state.status === 'loading' && <MutedHint>Loading comments</MutedHint>}
      {state.status === 'failed' && <MutedHint>Could not load comments</MutedHint>}
      {state.status === 'ready' && list.length === 0 && (
        <PopoverEmptyState icon={<VscComment />}>
          No active review. Comment on a line to start one.
        </PopoverEmptyState>
      )}
      {list.map((comment) => {
        return (
          <CommentRow
            key={comment.id}
            filePath={comment.filePath}
            location={LineRanges.shortLabel(comment.range)}
            body={CommentMarkdown.summary(comment.body)}
            onSelect={() => {
              focusComment(comment)
              onNavigate()
            }}
          />
        )
      })}
    </PopoverScrollArea>
  )
}
