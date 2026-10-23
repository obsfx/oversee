import type { AsyncResource } from '@/src/lib/async-resource.ts'
import type { ChangeFlows } from '@/src/lib/change-flows.ts'
import type { LanguageServerList } from '@/src/lib/language-server-gateway.ts'

export class ChangeFlowInstallSync {
  private readonly list: AsyncResource<LanguageServerList>
  private readonly flows: ChangeFlows

  constructor(list: AsyncResource<LanguageServerList>, flows: ChangeFlows) {
    this.list = list
    this.flows = flows
  }

  start() {
    return this.list.follow((state) => {
      if (state.status === 'ready') {
        this.flows.followInstalls(state.data)
      }
    })
  }
}
