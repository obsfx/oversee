import { LanguageServerFiles } from '@/src/lib/language-server-files.ts'
import type { LanguageServer, LanguageServerList } from '@/src/lib/language-server-gateway.ts'
import { LanguageServerStates } from '@/src/lib/language-server-states.ts'

export type LanguageServerNoticeKind = 'offer' | 'blocked' | 'installing' | 'failed' | 'ready'

export interface LanguageServerNotice {
  kind: LanguageServerNoticeKind
  server: LanguageServer
  fileLabel: string
  error: string
}

interface NoticeInput {
  list: LanguageServerList
  path: string | null
  dismissed: string[]
  readyId: string | null
  failures: ReadonlyMap<string, string>
}

export abstract class LanguageServerNotices {
  static of({
    list,
    path,
    dismissed,
    readyId,
    failures,
  }: NoticeInput): LanguageServerNotice | null {
    if (!path) {
      return null
    }
    const server = LanguageServerFiles.serverFor(list, path)
    if (!server) {
      return null
    }
    const notice = (kind: LanguageServerNoticeKind, error = ''): LanguageServerNotice => {
      return { kind, server, fileLabel: LanguageServerFiles.fileLabel(list, path), error }
    }
    if (readyId === server.id) {
      return notice('ready')
    }
    if (server.status === 'installed' || dismissed.includes(server.id)) {
      return null
    }
    if (server.status === 'installing') {
      return notice('installing')
    }
    if (server.status === 'failed') {
      return notice('failed', server.error)
    }
    const failure = failures.get(server.id)
    if (failure) {
      return notice('failed', failure)
    }
    if (LanguageServerStates.blocker(server)) {
      return notice('blocked')
    }
    return notice('offer')
  }
}
