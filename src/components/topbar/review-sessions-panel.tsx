import { VscHistory } from 'react-icons/vsc'
import { ReviewSessionDetail } from '@/src/components/topbar/review-session-detail.tsx'
import { ReviewSessionSummary } from '@/src/components/topbar/review-session-summary.tsx'
import { useReviewSessions } from '@/src/hooks/use-review-sessions.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { PopoverEmptyState } from '@/src/primitives/popover-empty-state.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'
import { SessionRow } from '@/src/primitives/session-row.tsx'

interface ReviewSessionsPanelProps {
  openedSession: ReviewSession | null
  onOpen: (id: string) => void
  onBack: () => void
}

export function ReviewSessionsPanel({ openedSession, onOpen, onBack }: ReviewSessionsPanelProps) {
  const { state, list } = useReviewSessions()
  if (openedSession) {
    return <ReviewSessionDetail session={openedSession} onBack={onBack} />
  }

  return (
    <PopoverScrollArea>
      {state.status === 'loading' && <MutedHint>Loading review sessions</MutedHint>}
      {state.status === 'failed' && <MutedHint>Could not load review sessions</MutedHint>}
      {state.status === 'ready' && list.length === 0 && (
        <PopoverEmptyState icon={<VscHistory />}>No finished reviews yet.</PopoverEmptyState>
      )}
      {list.map((session) => {
        return (
          <SessionRow
            key={session.id}
            onSelect={() => {
              onOpen(session.id)
            }}
          >
            <ReviewSessionSummary session={session} />
          </SessionRow>
        )
      })}
    </PopoverScrollArea>
  )
}
