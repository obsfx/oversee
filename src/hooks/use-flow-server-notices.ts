import { useLanguageServerActions } from '@/src/hooks/use-language-server-actions.ts'
import { useLanguageServers } from '@/src/hooks/use-language-servers.ts'
import type { ChangeFlow } from '@/src/lib/change-flow-gateway.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { FlowServerLabels } from '@/src/lib/flow-server-labels.ts'
import { type FlowServerNotice, FlowServerNotices } from '@/src/lib/flow-server-notices.ts'
import { LanguageServerStates } from '@/src/lib/language-server-states.ts'

const NO_NOTICES: FlowServerNotice[] = []

export const useFlowServerNotices = (
  flow: ChangeFlow | null,
  comparison: Comparison | null,
  refresh: () => void,
) => {
  const { list, platform } = useLanguageServers()
  const { failures, install, cancel } = useLanguageServerActions()

  let notices = NO_NOTICES
  if (flow !== null) {
    notices = FlowServerNotices.of(flow, list, failures)
  }
  let source = ''
  if (comparison !== null) {
    source = ComparisonRules.sourceLabel(comparison.source)
  }
  const models = FlowServerNotices.shown(notices).map((notice) => {
    const { languageServer } = notice
    let progress: number | null = null
    if (languageServer !== null) {
      progress = LanguageServerStates.ratio(languageServer.progress)
    }
    return {
      notice,
      title: FlowServerLabels.title(notice),
      detail: FlowServerLabels.detail(notice, source, platform),
      busy: FlowServerNotices.isPending(notice),
      actions: FlowServerNotices.actionsOf(notice),
      progress,
      install: () => {
        install(notice.server)
      },
      cancel: () => {
        cancel(notice.server)
      },
      retry: refresh,
    }
  })

  return { notices, models }
}

export type FlowServerNoticeModel = ReturnType<typeof useFlowServerNotices>['models'][number]
