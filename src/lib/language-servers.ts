import { AsyncResource } from '@/src/lib/async-resource.ts'
import type {
  LanguageServer,
  LanguageServerGateway,
  LanguageServerList,
} from '@/src/lib/language-server-gateway.ts'

export class LanguageServers {
  readonly list: AsyncResource<LanguageServerList>
  private readonly gateway: LanguageServerGateway

  constructor(gateway: LanguageServerGateway) {
    this.gateway = gateway
    this.list = new AsyncResource(() => {
      return gateway.list()
    })
  }

  async install(id: string) {
    const server = await this.gateway.install(id)
    this.list.update((list) => {
      return LanguageServers.replace(list, server)
    })
  }

  async uninstall(id: string) {
    await this.gateway.uninstall(id)
    await this.list.refresh()
  }

  async cancel(id: string) {
    await this.gateway.cancel(id)
    await this.list.refresh()
  }

  refresh() {
    this.list.invalidate()
  }

  private static replace(list: LanguageServerList, server: LanguageServer): LanguageServerList {
    return {
      ...list,
      servers: list.servers.map((current) => {
        return current.id === server.id ? server : current
      }),
    }
  }
}
