import { ReviewSessionDetail } from '@/src/components/topbar/review-session-detail.tsx'
import { useReviewSession } from '@/src/hooks/use-review-session.ts'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'

interface NotificationSessionProps {
  sessionId: string
  onBack: () => void
}

export function NotificationSession({ sessionId, onBack }: NotificationSessionProps) {
  const state = useReviewSession(sessionId)
  if (state.status === 'ready') {
    return <ReviewSessionDetail session={state.data} onBack={onBack} />
  }
  if (state.status === 'failed') {
    return <MutedHint>Could not load this review</MutedHint>
  }
  return <MutedHint>Loading review</MutedHint>
}
