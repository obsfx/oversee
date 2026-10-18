import { ReviewSessionSummary } from '@/src/components/topbar/review-session-summary.tsx'
import { SessionSnippet } from '@/src/components/topbar/session-snippet.tsx'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'
import { SessionComment } from '@/src/primitives/session-comment.tsx'
import { SessionDetailHeader } from '@/src/primitives/session-detail-header.tsx'

interface ReviewSessionDetailProps {
  session: ReviewSession
  onBack: () => void
}

export function ReviewSessionDetail({ session, onBack }: ReviewSessionDetailProps) {
  return (
    <>
      <SessionDetailHeader onBack={onBack}>
        <ReviewSessionSummary session={session} />
      </SessionDetailHeader>
      <PopoverScrollArea>
        <div className={'flex flex-col divide-y divide-line'}>
          {session.comments.map((comment) => {
            return (
              <SessionComment
                key={comment.id}
                filePath={comment.filePath}
                location={LineRanges.shortLabel(comment.range)}
                snippet={<SessionSnippet lines={comment.lines} filePath={comment.filePath} />}
                body={CommentMarkdown.summary(comment.body)}
              />
            )
          })}
        </div>
      </PopoverScrollArea>
    </>
  )
}
