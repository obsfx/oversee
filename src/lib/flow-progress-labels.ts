import plur from 'plur'
import { CallFlowLabels } from '@/src/lib/call-flow-labels.ts'
import {
  type FlowProgress,
  type FlowProgressLag,
  FlowProgressRules,
  type FlowServerProgress,
} from '@/src/lib/flow-progress.ts'
import type { LanguageServerList } from '@/src/lib/language-server-gateway.ts'
import { LanguageServers } from '@/src/lib/language-servers.ts'
import { ListLabels } from '@/src/lib/list-labels.ts'

export interface FlowProgressLine {
  ratio: number | null
  phase: string
}

export abstract class FlowProgressLabels {
  static readonly overall = 'Call flow progress'

  static readonly readingChanges = 'Reading the changes'

  static readonly building = 'Building the call tree'

  static line(
    progress: FlowProgress | null,
    list: LanguageServerList | null,
    loaded: boolean,
  ): FlowProgressLine {
    if (progress === null) {
      return { ratio: null, phase: loaded ? CallFlowLabels.waiting : CallFlowLabels.loading }
    }
    return {
      ratio: FlowProgressRules.ratio(progress.servers),
      phase: FlowProgressLabels.phase(progress.servers, list),
    }
  }

  static phase(servers: readonly FlowServerProgress[], list: LanguageServerList | null) {
    if (servers.length === 0) {
      return FlowProgressLabels.readingChanges
    }
    const lag = FlowProgressRules.lagging(servers)
    if (lag === null) {
      return FlowProgressLabels.building
    }
    const activity = FlowProgressLabels.activity(lag, list)
    if (servers.length === 1) {
      return activity
    }
    const ready = FlowProgressRules.readyCount(servers)
    return `${activity}, ${ready} of ${servers.length} ${plur('server', servers.length)} ready`
  }

  private static activity(lag: FlowProgressLag, list: LanguageServerList | null) {
    const { done, total } = lag
    switch (lag.phase) {
      case 'starting': {
        return `Starting ${ListLabels.and(
          lag.servers.map(({ server }) => {
            return server
          }),
        )}`
      }
      case 'reading': {
        return `Reading symbols in ${FlowProgressLabels.languages(lag, list)}, ${done} of ${total} ${plur('file', total)}`
      }
      case 'tracing': {
        return `Tracing calls in ${FlowProgressLabels.languages(lag, list)}, ${done} of ${total} ${plur('function', total)}`
      }
    }
  }

  private static languages(lag: FlowProgressLag, list: LanguageServerList | null) {
    const names = lag.servers.map(({ server }) => {
      return LanguageServers.byId(list, server)?.languages[0] ?? server
    })
    return ListLabels.and([...new Set(names)])
  }
}
