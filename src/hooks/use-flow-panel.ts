import { useCallFlow } from '@/src/hooks/use-call-flow.ts'
import { useCallFlowTree } from '@/src/hooks/use-call-flow-tree.ts'
import { useFlowProgress } from '@/src/hooks/use-flow-progress.ts'
import { useFlowServerNotices } from '@/src/hooks/use-flow-server-notices.ts'
import { useLanguageServers } from '@/src/hooks/use-language-servers.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import { CallFlowGraphs } from '@/src/lib/call-flow.ts'
import { FlowPanelStates } from '@/src/lib/flow-panel-states.ts'

export const useFlowPanel = () => {
  const { state, comparison, retry, refresh } = useCallFlow()
  const flow = ResourceStates.dataOr(state, null)
  const { attachScrollElement, ...tree } = useCallFlowTree(flow?.graph ?? CallFlowGraphs.empty)
  const { notices, models } = useFlowServerNotices(flow, comparison, refresh)
  const { list } = useLanguageServers()
  const progress = useFlowProgress(comparison)

  return {
    content: FlowPanelStates.contentOf(state, notices),
    progress: FlowPanelStates.progressOf(state, notices, progress, list),
    failure: state.status === 'failed' ? state.error.message : '',
    retry,
    tree,
    attachScrollElement,
    notices: models,
  }
}
