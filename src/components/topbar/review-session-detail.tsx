import { CommentReaderDialog } from '@/src/components/topbar/comment-reader-dialog.tsx'
import { ReviewSessionSummary } from '@/src/components/topbar/review-session-summary.tsx'
import { SessionCommentItem } from '@/src/components/topbar/session-comment-item.tsx'
import { useCommentReader } from '@/src/hooks/use-comment-reader.ts'
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
  const reader = useCommentReader(session.comments)

  return (
    <>
      <DetailHeader backLabel={backLabel} onBack={onBack}>
        <ReviewSessionSummary session={session} />
      </DetailHeader>
      <PopoverScrollArea>
        <div className={'flex flex-col divide-y divide-line'}>
          {session.comments.map((comment) => {
            return (
              <SessionCommentItem
                key={comment.id}
                comment={comment}
                onNavigate={onNavigate}
                onRead={() => {
                  reader.show(comment.id)
                }}
              />
            )
          })}
        </div>
      </PopoverScrollArea>
      <CommentReaderDialog reader={reader} onNavigate={onNavigate} />
    </>
  )
}
