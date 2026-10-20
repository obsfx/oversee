import type { AsyncResource, ResourceState } from '@/src/lib/async-resource.ts'
import type { LanguageServerList } from '@/src/lib/language-server-gateway.ts'

type ListState = ResourceState<LanguageServerList>

export interface ReadyServerPort {
  show(id: string): void
  hide(id: string): void
}

export class InstallCompletionWatch {
  static readonly readyMs = 2500
  private readonly list: AsyncResource<LanguageServerList>
  private readonly ready: ReadyServerPort

  constructor(list: AsyncResource<LanguageServerList>, ready: ReadyServerPort) {
    this.list = list
    this.ready = ready
  }

  private static completed(state: ListState, previous: ListState) {
    if (state.status !== 'ready' || previous.status !== 'ready') {
      return []
    }
    const installing = new Set(
      previous.data.servers
        .filter((server) => {
          return server.status === 'installing'
        })
        .map((server) => {
          return server.id
        }),
    )
    return state.data.servers
      .filter((server) => {
        return server.status === 'installed' && installing.has(server.id)
      })
      .map((server) => {
        return server.id
      })
  }

  start() {
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const unsubscribe = this.list.store.subscribe((state, previous) => {
      for (const id of InstallCompletionWatch.completed(state, previous)) {
        this.ready.show(id)
        const timer = setTimeout(() => {
          timers.delete(timer)
          this.ready.hide(id)
        }, InstallCompletionWatch.readyMs)
        timers.add(timer)
      }
    })
    return () => {
      unsubscribe()
      for (const timer of timers) {
        clearTimeout(timer)
      }
    }
  }
}
