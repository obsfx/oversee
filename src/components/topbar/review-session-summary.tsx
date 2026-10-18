import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { ReviewSessionLabels } from '@/src/lib/review-session-labels.ts'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'
import { SessionSummary } from '@/src/primitives/session-summary.tsx'

export function ReviewSessionSummary({ session }: { session: ReviewSession }) {
  return (
    <SessionSummary
      leading={<SessionStatusIcon status={session.status} />}
      title={ReviewSessionLabels.title(session)}
      subtitle={ComparisonRules.sourceLabel(session.comparison.source)}
      meta={ReviewSessionLabels.count(session)}
    />
  )
}
