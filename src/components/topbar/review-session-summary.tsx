import { useComparison } from '@/src/hooks/use-comparison.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import type { ReviewSession } from '@/src/lib/review-session-gateway.ts'
import { ReviewSessionLabels } from '@/src/lib/review-session-labels.ts'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'
import { SessionSummary } from '@/src/primitives/session-summary.tsx'

export function ReviewSessionSummary({ session }: { session: ReviewSession }) {
  const { comparison } = useComparison()
  const branch = comparison ? ComparisonRules.sourceLabel(comparison.source) : ''

  return (
    <SessionSummary
      leading={<SessionStatusIcon status={session.status} />}
      title={ReviewSessionLabels.title(session)}
      subtitle={branch}
      meta={ReviewSessionLabels.count(session)}
    />
  )
}
