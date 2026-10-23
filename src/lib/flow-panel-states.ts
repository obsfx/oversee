import type { ResourceState } from '@/src/lib/async-resource.ts'
import type { ChangeFlow } from '@/src/lib/change-flow-gateway.ts'
import type { FlowProgress } from '@/src/lib/flow-progress.ts'
import { type FlowProgressLine, FlowProgressLabels } from '@/src/lib/flow-progress-labels.ts'
import { type FlowServerNotice, FlowServerNotices } from '@/src/lib/flow-server-notices.ts'
import type { LanguageServerList } from '@/src/lib/language-server-gateway.ts'

export type FlowPanelContent = 'progress' | 'failed' | 'tree' | 'notices' | 'empty'

export abstract class FlowPanelStates {
  static contentOf(
    state: ResourceState<ChangeFlow>,
    notices: readonly FlowServerNotice[],
  ): FlowPanelContent {
    if (state.status === 'failed') {
      return 'failed'
    }
    if (state.status !== 'ready') {
      return 'progress'
    }
    if (state.data.graph.nodes.length > 0) {
      return 'tree'
    }
    if (FlowServerNotices.pending(notices)) {
      return 'progress'
    }
    const explained = notices.some((notice) => {
      return notice.kind !== 'unsupported'
    })
    if (explained) {
      return 'notices'
    }
    return 'empty'
  }

  static progressOf(
    state: ResourceState<ChangeFlow>,
    notices: readonly FlowServerNotice[],
    progress: FlowProgress | null,
    list: LanguageServerList | null,
  ): FlowProgressLine | null {
    const content = FlowPanelStates.contentOf(state, notices)
    const rebuilding = content === 'tree' && FlowServerNotices.tracing(notices)
    if (content !== 'progress' && !rebuilding) {
      return null
    }
    return FlowProgressLabels.line(progress, list, state.status === 'ready')
  }
}
