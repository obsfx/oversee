import type { ChangeFlow } from '@/src/lib/change-flow-gateway.ts'
import type { LanguageServer, LanguageServerList } from '@/src/lib/language-server-gateway.ts'
import { LanguageServerStates } from '@/src/lib/language-server-states.ts'
import { LanguageServers } from '@/src/lib/language-servers.ts'

export type FlowServerNoticeKind =
  | 'offer'
  | 'blocked'
  | 'installing'
  | 'install-failed'
  | 'needs-checkout'
  | 'starting'
  | 'indexing'
  | 'failed'
  | 'unsupported'

export interface FlowServerNotice {
  kind: FlowServerNoticeKind
  key: string
  server: string
  languageServer: LanguageServer | null
  error: string
}

export interface FlowServerNoticeActions {
  install: boolean
  cancel: boolean
  details: boolean
  retryInstall: boolean
  retry: boolean
}

const CHECKOUT = 'needs-checkout'

export abstract class FlowServerNotices {
  static of(
    flow: ChangeFlow,
    list: LanguageServerList | null,
    failures: ReadonlyMap<string, string>,
  ): FlowServerNotice[] {
    const notices: FlowServerNotice[] = []
    const needsCheckout = flow.servers.some((entry) => {
      return entry.status === 'needs-checkout'
    })
    if (needsCheckout) {
      notices.push({ kind: CHECKOUT, key: CHECKOUT, server: '', languageServer: null, error: '' })
    }
    for (const { server, status, error } of flow.servers) {
      if (status === 'ready' || status === 'needs-checkout') {
        continue
      }
      const languageServer = LanguageServers.byId(list, server)
      const notice = (kind: FlowServerNoticeKind, reason = ''): FlowServerNotice => {
        return { kind, key: server, server, languageServer, error: reason }
      }
      if (status === 'not-installed') {
        notices.push(FlowServerNotices.missing(notice, languageServer, failures))
        continue
      }
      notices.push(notice(status, error))
    }
    return notices
  }

  static pending(notices: readonly FlowServerNotice[]) {
    return notices.some(FlowServerNotices.isPending)
  }

  static isPending(notice: FlowServerNotice) {
    return FlowServerNotices.isTracing(notice) || notice.kind === 'installing'
  }

  static tracing(notices: readonly FlowServerNotice[]) {
    return notices.some(FlowServerNotices.isTracing)
  }

  static isTracing(notice: FlowServerNotice) {
    return notice.kind === 'starting' || notice.kind === 'indexing'
  }

  static shown(notices: readonly FlowServerNotice[]) {
    return notices.filter((notice) => {
      return !FlowServerNotices.isTracing(notice)
    })
  }

  static actionsOf(notice: FlowServerNotice): FlowServerNoticeActions {
    const { kind, languageServer, error } = notice
    let installable = false
    if (languageServer !== null) {
      installable = LanguageServerStates.blocker(languageServer) === null
    }
    return {
      install: kind === 'offer' && installable,
      cancel: kind === 'installing',
      details: (kind === 'install-failed' || kind === 'failed') && error !== '',
      retryInstall: kind === 'install-failed',
      retry: kind === 'failed',
    }
  }

  static hasActions(actions: FlowServerNoticeActions) {
    return Object.values(actions).some(Boolean)
  }

  private static missing(
    notice: (kind: FlowServerNoticeKind, reason?: string) => FlowServerNotice,
    languageServer: LanguageServer | null,
    failures: ReadonlyMap<string, string>,
  ) {
    if (languageServer === null) {
      return notice('offer')
    }
    if (languageServer.status === 'installed') {
      return notice('starting')
    }
    const state = LanguageServerStates.installState(languageServer, failures)
    if (state.kind === 'failed') {
      return notice('install-failed', state.error)
    }
    return notice(state.kind, state.error)
  }
}
