import { fn } from 'storybook/test'
import { FlowServerNoticeList } from '@/src/components/sidebar/flow-server-notice-list.tsx'
import { useFlowServerNotices } from '@/src/hooks/use-flow-server-notices.ts'
import type { ChangeFlow } from '@/src/lib/change-flow-gateway.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'

const comparison = { source: ComparisonRules.branch('feat/comment-threads'), target: 'main' }

export function StoryFlowNotices({ flow }: { flow: ChangeFlow }) {
  const { models } = useFlowServerNotices(flow, comparison, fn())
  return <FlowServerNoticeList notices={models} />
}
