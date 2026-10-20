import type { InstallProgress, LanguageServer } from '@/src/lib/language-server-gateway.ts'

export type LanguageServerAction = 'install' | 'update' | 'retry' | 'remove' | 'cancel'

export type LanguageServerTone = 'muted' | 'accent' | 'warning' | 'danger'

export type LanguageServerBlocker = { kind: 'unavailable' } | { kind: 'missing'; tools: string[] }

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
      return { kind: 'missing', tools: server.missing }
    }
    return null
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
    const needle = query.trim().toLowerCase()
    if (needle === '') {
      return true
    }
    return (
      server.id.includes(needle) ||
      server.languages.some((language) => {
        return language.toLowerCase().includes(needle)
      })
    )
  }

  static installedCount(servers: LanguageServer[]) {
    return servers.filter((server) => {
      return server.installedVersion !== ''
    }).length
  }
}
