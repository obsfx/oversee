import type {
  InstallProgress,
  LanguageServer,
  OutdatedTool,
} from '@/src/lib/language-server-gateway.ts'
import { TextQueries } from '@/src/lib/text-queries.ts'

export type LanguageServerAction = 'install' | 'update' | 'retry' | 'remove' | 'cancel'

export type LanguageServerTone = 'muted' | 'accent' | 'warning' | 'danger'

export type LanguageServerBlocker =
  { kind: 'unavailable' } | { kind: 'missing'; tools: string[]; outdated: OutdatedTool[] }

export interface LanguageServerInstallState {
  kind: 'installing' | 'failed' | 'blocked' | 'offer'
  error: string
}

export abstract class LanguageServerStates {
  static ratio(progress: InstallProgress | null) {
    if (!progress || progress.total === 0) {
      return null
    }
    return Math.min(1, progress.received / progress.total)
  }

  static blocker(server: LanguageServer): LanguageServerBlocker | null {
    if (!server.available) {
      return { kind: 'unavailable' }
    }
    if (server.missing.length > 0) {
      return { kind: 'missing', tools: server.missing, outdated: server.outdated }
    }
    return null
  }

  static installState(
    server: LanguageServer,
    failures: ReadonlyMap<string, string>,
  ): LanguageServerInstallState {
    if (server.status === 'installing') {
      return { kind: 'installing', error: '' }
    }
    if (server.status === 'failed') {
      return { kind: 'failed', error: server.error }
    }
    const failure = failures.get(server.id)
    if (failure !== undefined) {
      return { kind: 'failed', error: failure }
    }
    if (LanguageServerStates.blocker(server)) {
      return { kind: 'blocked', error: '' }
    }
    return { kind: 'offer', error: '' }
  }

  static actions(server: LanguageServer) {
    const actions: LanguageServerAction[] = []
    if (server.status === 'installing') {
      actions.push('cancel')
      return actions
    }
    if (server.installedVersion !== '') {
      actions.push('remove')
    }
    if (LanguageServerStates.blocker(server)) {
      return actions
    }
    if (server.status === 'failed') {
      actions.push('retry')
    } else if (server.status === 'not-installed') {
      actions.push('install')
    } else if (server.updateAvailable) {
      actions.push('update')
    }
    return actions
  }

  static tone(server: LanguageServer): LanguageServerTone {
    if (server.status === 'failed') {
      return 'danger'
    }
    if (server.status === 'installed' && server.updateAvailable) {
      return 'accent'
    }
    if (server.status === 'not-installed' && LanguageServerStates.blocker(server)) {
      return 'warning'
    }
    return 'muted'
  }

  static matches(server: LanguageServer, query: string) {
    return (
      TextQueries.matches(server.id, query) ||
      server.languages.some((language) => {
        return TextQueries.matches(language, query)
      })
    )
  }

  static installedCount(servers: LanguageServer[]) {
    return LanguageServerStates.installed(servers).length
  }

  static installedKey(servers: LanguageServer[]) {
    return LanguageServerStates.installed(servers)
      .map((server) => {
        return `${server.id}@${server.installedVersion}`
      })
      .join(',')
  }

  private static installed(servers: LanguageServer[]) {
    return servers.filter((server) => {
      return server.installedVersion !== ''
    })
  }
}
