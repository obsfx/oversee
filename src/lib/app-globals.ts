import { ApiClient } from '@/src/lib/api-client.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export interface OverseeGlobal {
  baseUrl: string
  wsUrl: string
  workspace?: unknown
}

declare global {
  interface Window {
    __overseeGlobal?: unknown
  }
}

export abstract class AppGlobals {
  private static readonly socketPath = '/ws'

  static read(): OverseeGlobal {
    const injected = window.__overseeGlobal
    if (AppGlobals.isOverseeGlobal(injected)) {
      return injected
    }
    return AppGlobals.fromLocation()
  }

  private static isOverseeGlobal(value: unknown): value is OverseeGlobal {
    const { baseUrl, wsUrl } = ApiClient.fieldsOf(value)
    return ValueGuards.isString(baseUrl) && ValueGuards.isString(wsUrl)
  }

  private static fromLocation(): OverseeGlobal {
    const socketUrl = new URL(AppGlobals.socketPath, window.location.origin)
    socketUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return {
      baseUrl: window.location.origin,
      wsUrl: socketUrl.toString(),
    }
  }
}
