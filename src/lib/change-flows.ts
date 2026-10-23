import type { ChangeFlow, ChangeFlowGateway } from '@/src/lib/change-flow-gateway.ts'
import type { ChangeFlowProgress } from '@/src/lib/change-flow-progress.ts'
import { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import type { LanguageServerList } from '@/src/lib/language-server-gateway.ts'
import { LanguageServerStates } from '@/src/lib/language-server-states.ts'

export class ChangeFlows {
  static readonly retryMs = 2000
  private readonly cache: ComparisonCache<ChangeFlow>
  private readonly retries = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly progress: ChangeFlowProgress
  private installed: string | null = null

  constructor(gateway: ChangeFlowGateway, progress: ChangeFlowProgress) {
    this.progress = progress
    this.cache = new ComparisonCache((comparison) => {
      return this.load(gateway, comparison)
    })
  }

  static pending(flow: ChangeFlow) {
    return flow.servers.some((server) => {
      return server.status === 'starting' || server.status === 'indexing'
    })
  }

  get(comparison: Comparison) {
    return this.cache.get(comparison)
  }

  invalidateWhere(matches: (comparison: Comparison) => boolean) {
    this.cache.invalidateWhere(matches)
  }

  followInstalls(list: LanguageServerList) {
    const installed = LanguageServerStates.installedKey(list.servers)
    if (this.installed !== null && this.installed !== installed) {
      this.cache.invalidateWhere(() => {
        return true
      })
    }
    this.installed = installed
  }

  private async load(gateway: ChangeFlowGateway, comparison: Comparison) {
    let flow: ChangeFlow
    try {
      flow = await gateway.load(comparison)
    } catch (error) {
      const shown = this.cache.get(comparison).store.getState()
      if (shown.status === 'ready' && ChangeFlows.pending(shown.data)) {
        this.scheduleRetry(comparison)
      }
      throw error
    }
    if (ChangeFlows.pending(flow)) {
      this.scheduleRetry(comparison)
    } else {
      this.progress.forget(comparison)
    }
    return flow
  }

  private scheduleRetry(comparison: Comparison) {
    const key = ComparisonRules.key(comparison)
    clearTimeout(this.retries.get(key))
    this.retries.set(
      key,
      setTimeout(() => {
        this.retries.delete(key)
        this.cache.invalidate(comparison)
      }, ChangeFlows.retryMs),
    )
  }
}
