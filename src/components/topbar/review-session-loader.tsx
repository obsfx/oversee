import { ReviewSessionDetail } from '@/src/components/topbar/review-session-detail.tsx'
import { useReviewSession } from '@/src/hooks/use-review-session.ts'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'

interface ReviewSessionLoaderProps {
  sessionId: string
  backLabel: string
  onBack: () => void
  onNavigate: () => void
}

export function ReviewSessionLoader({
  sessionId,
  backLabel,
  onBack,
  onNavigate,
}: ReviewSessionLoaderProps) {
  const state = useReviewSession(sessionId)
  if (state.status === 'ready') {
    return (
      <ReviewSessionDetail
        session={state.data}
        backLabel={backLabel}
        onBack={onBack}
        onNavigate={onNavigate}
      />
    )
  }
  if (state.status === 'failed') {
    return <MutedHint>Could not load this review</MutedHint>
  }
  return <MutedHint>Loading review</MutedHint>
}
