import * as v from 'valibot'

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

  private static readonly injected = v.object({
    baseUrl: v.string(),
    wsUrl: v.string(),
    workspace: v.optional(v.unknown()),
  })

  static read(): OverseeGlobal {
    const result = v.safeParse(AppGlobals.injected, window.__overseeGlobal)
    if (result.success) {
      return result.output
    }
    return AppGlobals.fromLocation()
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
