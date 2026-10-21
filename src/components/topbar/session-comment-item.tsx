import { CommentReplies } from '@/src/components/topbar/comment-replies.tsx'
import { SessionSnippet } from '@/src/components/topbar/session-snippet.tsx'
import { MarkdownView } from '@/src/components/markdown-view.tsx'
import { useCommentLocationOpener } from '@/src/hooks/use-comment-location-opener.ts'
import { useSessionCommentFocus } from '@/src/hooks/use-session-comment-focus.ts'
import { CommentLists } from '@/src/lib/comment-lists.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import type { SessionComment as SessionCommentData } from '@/src/lib/review-session-gateway.ts'
import { OutdatedLabel } from '@/src/primitives/outdated-label.tsx'
import { SessionComment } from '@/src/primitives/session-comment.tsx'

interface SessionCommentItemProps {
  comment: SessionCommentData
  onNavigate: () => void
}

export function SessionCommentItem({ comment, onNavigate }: SessionCommentItemProps) {
  const { attach, highlightKey, endHighlight } = useSessionCommentFocus(comment.id)
  const openLocation = useCommentLocationOpener(onNavigate)
  const outdated = CommentLists.isOutdated(comment)

  return (
    <SessionComment
      key={highlightKey ?? 'idle'}
      ref={attach}
      highlighted={highlightKey !== null}
      onAnimationEnd={endHighlight}
      filePath={comment.filePath}
      location={LineRanges.shortLabel(comment.range)}
      onOpenFile={() => {
        openLocation(comment)
      }}
      marker={outdated && <OutdatedLabel />}
      dimmed={outdated}
      snippet={<SessionSnippet lines={comment.lines} filePath={comment.filePath} />}
      body={<MarkdownView body={comment.body} />}
      replies={<CommentReplies replies={comment.replies} />}
    />
  )
}
