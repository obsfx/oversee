import { ApiError } from '@/src/lib/api-client.ts'
import type { InMemoryEventStream } from '@/src/lib/in-memory-event-stream.ts'
import type {
  LanguageServer,
  LanguageServerGateway,
  LanguageServerList,
} from '@/src/lib/language-server-gateway.ts'

interface InMemoryLanguageServerOptions {
  events?: InMemoryEventStream
  failing?: string[]
  installMs?: number
  downloadBytes?: number
}

// Storybook stand-in for HttpLanguageServerGateway, never used by the app. Stories run without the
// Go server, so this simulates installs (progress, failures, missing tools, cancel, remove) and emits
// language-servers.changed on the in-memory event stream the way the server does.
export class InMemoryLanguageServerGateway implements LanguageServerGateway {
  private static readonly tickMs = 120
  private current: LanguageServerList
  private readonly events: InMemoryEventStream | null
  private readonly failing: Set<string>
  private readonly installMs: number
  private readonly downloadBytes: number
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(list: LanguageServerList, options: InMemoryLanguageServerOptions = {}) {
    this.current = structuredClone(list)
    this.events = options.events ?? null
    this.failing = new Set(options.failing ?? [])
    this.installMs = options.installMs ?? 2400
    this.downloadBytes = options.downloadBytes ?? 18_400_000
  }

  list() {
    return Promise.resolve(structuredClone(this.current))
  }

  install(id: string) {
    const server = this.find(id)
    if (!server.available || server.missing.length > 0) {
      return Promise.reject(new ApiError(`/api/language-servers/${id}/install`, 'conflict', 409))
    }
    if (server.status !== 'installing') {
      this.change(id, {
        status: 'installing',
        progress: { received: 0, total: this.downloadBytes },
        error: '',
      })
      this.simulate(id, 0)
    }
    return Promise.resolve(structuredClone(this.find(id)))
  }

  uninstall(id: string) {
    if (this.find(id).status === 'installing') {
      return Promise.reject(new ApiError(`/api/language-servers/${id}`, 'conflict', 409))
    }
    this.change(id, {
      status: 'not-installed',
      installedVersion: '',
      updateAvailable: false,
      error: '',
    })
    return Promise.resolve()
  }

  cancel(id: string) {
    clearTimeout(this.timers.get(id))
    this.timers.delete(id)
    const server = this.find(id)
    if (server.status === 'installing') {
      let status: LanguageServer['status'] = 'not-installed'
      if (server.installedVersion !== '') {
        status = 'installed'
      }
      this.change(id, { status, progress: null })
    }
    return Promise.resolve()
  }

  private simulate(id: string, elapsed: number) {
    const timer = setTimeout(() => {
      const next = elapsed + InMemoryLanguageServerGateway.tickMs
      if (next < this.installMs) {
        const received = Math.round((this.downloadBytes * next) / this.installMs)
        this.change(id, { progress: { received, total: this.downloadBytes } })
        this.simulate(id, next)
        return
      }
      this.finish(id)
    }, InMemoryLanguageServerGateway.tickMs)
    this.timers.set(id, timer)
  }

  private finish(id: string) {
    this.timers.delete(id)
    const server = this.find(id)
    if (this.failing.has(id)) {
      this.change(id, {
        status: 'failed',
        progress: null,
        error: `download https://github.com/example/${id}.tar.gz: checksum 3f1c does not match 9ab2`,
      })
      return
    }
    this.change(id, {
      status: 'installed',
      progress: null,
      installedVersion: server.version,
      updateAvailable: false,
    })
  }

  private find(id: string) {
    const server = this.current.servers.find((candidate) => {
      return candidate.id === id
    })
    if (!server) {
      throw new ApiError(`/api/language-servers/${id}`, 'not found', 404)
    }
    return server
  }

  private change(id: string, patch: Partial<LanguageServer>) {
    this.current = {
      ...this.current,
      servers: this.current.servers.map((server) => {
        return server.id === id ? { ...server, ...patch } : server
      }),
    }
    this.events?.emit({ kind: 'language-servers.changed' })
  }
}
