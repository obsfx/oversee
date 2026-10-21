import { VscHistory } from 'react-icons/vsc'
import { ReviewSessionLoader } from '@/src/components/topbar/review-session-loader.tsx'
import { ReviewSessionSummary } from '@/src/components/topbar/review-session-summary.tsx'
import { useReviewSessions } from '@/src/hooks/use-review-sessions.ts'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { PopoverEmptyState } from '@/src/primitives/popover-empty-state.tsx'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'
import { SessionRow } from '@/src/primitives/session-row.tsx'

interface ReviewSessionsPanelProps {
  openedSessionId: string | null
  onOpen: (id: string) => void
  onBack: () => void
  onNavigate: () => void
}

export function ReviewSessionsPanel({
  openedSessionId,
  onOpen,
  onBack,
  onNavigate,
}: ReviewSessionsPanelProps) {
  const { state, list } = useReviewSessions()
  if (openedSessionId) {
    return (
      <ReviewSessionLoader
        sessionId={openedSessionId}
        backLabel={'Back to sessions'}
        onBack={onBack}
        onNavigate={onNavigate}
      />
    )
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
