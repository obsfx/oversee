import type { FlowServerNotice } from '@/src/lib/flow-server-notices.ts'
import { LanguageServerLabels } from '@/src/lib/language-server-labels.ts'
import { LanguageServerStates } from '@/src/lib/language-server-states.ts'
import { ServerStatusLabels } from '@/src/lib/server-status-labels.ts'

export abstract class FlowServerLabels {
  private static readonly waiting = 'The flow updates when it is ready'

  static title({ kind, server }: FlowServerNotice) {
    switch (kind) {
      case 'offer':
      case 'blocked': {
        return ServerStatusLabels.title('not-installed', server)
      }
      case 'installing': {
        return `Installing ${server}`
      }
      case 'install-failed': {
        return `${server} did not install`
      }
      case 'needs-checkout': {
        return 'Not checked out'
      }
      case 'starting':
      case 'indexing':
      case 'failed': {
        return ServerStatusLabels.title(kind, server)
      }
      case 'unsupported': {
        return `${server} lists no calls`
      }
    }
  }

  static detail(notice: FlowServerNotice, source: string, platform: string) {
    const { languageServer } = notice
    switch (notice.kind) {
      case 'offer': {
        if (languageServer === null) {
          return 'Install it from Settings, Language servers'
        }
        return `Install it to trace ${LanguageServerLabels.languages(languageServer)}`
      }
      case 'blocked': {
        const blocker = languageServer ? LanguageServerStates.blocker(languageServer) : null
        if (blocker === null) {
          return ''
        }
        return LanguageServerLabels.blocker(blocker, platform)
      }
      case 'installing': {
        return LanguageServerLabels.progress(languageServer?.progress ?? null)
      }
      case 'install-failed':
      case 'failed': {
        return LanguageServerLabels.firstLine(notice.error)
      }
      case 'needs-checkout': {
        return `Check out ${source} to trace its calls`
      }
      case 'starting':
      case 'indexing': {
        return FlowServerLabels.waiting
      }
      case 'unsupported': {
        return 'It does not report call hierarchy'
      }
    }
  }
}
