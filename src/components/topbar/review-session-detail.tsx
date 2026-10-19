import { CommentReplies } from '@/src/components/topbar/comment-replies.tsx'
import { ReviewSessionSummary } from '@/src/components/topbar/review-session-summary.tsx'
import { SessionSnippet } from '@/src/components/topbar/session-snippet.tsx'
import { MarkdownView } from '@/src/components/markdown-view.tsx'
import { CommentLists } from '@/src/lib/comment-lists.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { DetailHeader } from '@/src/primitives/detail-header.tsx'
import { OutdatedLabel } from '@/src/primitives/outdated-label.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'
import { SessionComment } from '@/src/primitives/session-comment.tsx'

interface ReviewSessionDetailProps {
  session: ReviewSession
  onBack: () => void
}

export function ReviewSessionDetail({ session, onBack }: ReviewSessionDetailProps) {
  return (
    <>
      <DetailHeader backLabel={'Back to sessions'} onBack={onBack}>
        <ReviewSessionSummary session={session} />
      </DetailHeader>
      <PopoverScrollArea>
        <div className={'flex flex-col divide-y divide-line'}>
          {session.comments.map((comment) => {
            const outdated = CommentLists.isOutdated(comment)
            return (
              <SessionComment
                key={comment.id}
                filePath={comment.filePath}
                location={LineRanges.shortLabel(comment.range)}
                marker={outdated && <OutdatedLabel />}
                dimmed={outdated}
                snippet={<SessionSnippet lines={comment.lines} filePath={comment.filePath} />}
                body={<MarkdownView body={comment.body} />}
                replies={<CommentReplies replies={comment.replies} />}
              />
            )
          })}
        </div>
      </PopoverScrollArea>
    </>
  )
}
