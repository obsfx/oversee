import { ReviewSessionSummary } from '@/src/components/topbar/review-session-summary.tsx'
import { SessionCommentItem } from '@/src/components/topbar/session-comment-item.tsx'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { DetailHeader } from '@/src/primitives/detail-header.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'

interface ReviewSessionDetailProps {
  session: ReviewSession
  backLabel: string
  onBack: () => void
  onNavigate: () => void
}

export function ReviewSessionDetail({
  session,
  backLabel,
  onBack,
  onNavigate,
}: ReviewSessionDetailProps) {
  return (
    <>
      <DetailHeader backLabel={backLabel} onBack={onBack}>
        <ReviewSessionSummary session={session} />
      </DetailHeader>
      <PopoverScrollArea>
        <div className={'flex flex-col divide-y divide-line'}>
          {session.comments.map((comment) => {
            return <SessionCommentItem key={comment.id} comment={comment} onNavigate={onNavigate} />
          })}
        </div>
      </PopoverScrollArea>
    </>
  )
}
