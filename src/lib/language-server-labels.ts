import { ApiError } from '@/src/lib/api-client.ts'
import type { ResourceState } from '@/src/lib/async-resource.ts'
import type {
  InstallProgress,
  LanguageServer,
  LanguageServerList,
} from '@/src/lib/language-server-gateway.ts'
import type { LanguageServerNotice } from '@/src/lib/language-server-notices.ts'
import {
  type LanguageServerAction,
  type LanguageServerBlocker,
  LanguageServerStates,
} from '@/src/lib/language-server-states.ts'

export interface RequirementLabel {
  tool: string
  missing: boolean
  title: string
}

export type LanguageServerRequest = 'install' | 'remove' | 'cancel'

const REQUESTS: Record<LanguageServerRequest, string> = {
  install: 'Install',
  remove: 'Remove',
  cancel: 'Cancel',
}

const ACTIONS: Record<LanguageServerAction, string> = {
  install: 'Install',
  update: 'Update',
  retry: 'Retry',
  remove: 'Remove',
  cancel: 'Cancel',
}

export abstract class LanguageServerLabels {
  private static readonly list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })

  static action(action: LanguageServerAction) {
    return ACTIONS[action]
  }

  static languages(server: LanguageServer) {
    return server.languages.join(', ')
  }

  static progress(progress: InstallProgress | null) {
    if (progress && progress.total > 0) {
      return `${LanguageServerLabels.megabytes(progress.received)} of ${LanguageServerLabels.megabytes(progress.total)}`
    }
    if (progress && progress.received > 0) {
      return `${LanguageServerLabels.megabytes(progress.received)} downloaded`
    }
    return 'Installing'
  }

  static status(server: LanguageServer, platform: string) {
    if (server.status === 'installing') {
      return LanguageServerLabels.progress(server.progress)
    }
    if (server.status === 'failed') {
      return 'Install failed'
    }
    if (server.status === 'installed' && server.updateAvailable) {
      return `${server.installedVersion} installed, ${server.version} available`
    }
    if (server.status === 'installed') {
      return `${server.installedVersion} installed`
    }
    const blocker = LanguageServerStates.blocker(server)
    if (blocker) {
      return LanguageServerLabels.blocker(blocker, platform)
    }
    return `${server.version} available`
  }

  static blocker(blocker: LanguageServerBlocker, platform: string) {
    if (blocker.kind === 'unavailable') {
      return `No build for ${platform}`
    }
    return `Needs ${LanguageServerLabels.list.format(blocker.tools)} on PATH`
  }

  static overview(state: ResourceState<LanguageServerList>) {
    if (state.status === 'failed') {
      return 'Unavailable'
    }
    if (state.status !== 'ready') {
      return 'Loading'
    }
    const installed = LanguageServerStates.installedCount(state.data.servers)
    return installed === 0 ? 'None installed' : `${installed} installed`
  }

  static requirements(server: LanguageServer): RequirementLabel[] {
    return server.requires.map((tool) => {
      const missing = server.missing.includes(tool)
      return { tool, missing, title: missing ? `${tool} is not on PATH` : `${tool} is on PATH` }
    })
  }

  static noticeTitle(notice: LanguageServerNotice) {
    switch (notice.kind) {
      case 'offer': {
        return `Go to definition for ${notice.fileLabel}`
      }
      case 'blocked': {
        return `No go to definition for ${notice.fileLabel}`
      }
      case 'installing': {
        return `Installing ${notice.server.id}`
      }
      case 'failed': {
        return `${notice.server.id} did not install`
      }
      case 'ready': {
        return `${notice.server.id} ${notice.server.version} is installed`
      }
    }
  }

  static noticeDetail(notice: LanguageServerNotice, platform: string) {
    const { server } = notice
    switch (notice.kind) {
      case 'offer': {
        if (server.requires.length === 0) {
          return `Install ${server.id} ${server.version}`
        }
        return `Install ${server.id} ${server.version}, needs ${LanguageServerLabels.list.format(server.requires)}`
      }
      case 'blocked': {
        const blocker = LanguageServerStates.blocker(server)
        if (blocker?.kind === 'missing') {
          return `${server.id} needs ${LanguageServerLabels.list.format(blocker.tools)} on PATH`
        }
        return `${server.id} has no build for ${platform}`
      }
      case 'installing': {
        return LanguageServerLabels.progress(server.progress)
      }
      case 'failed': {
        return LanguageServerLabels.firstLine(notice.error)
      }
      case 'ready': {
        return `Ready for ${notice.fileLabel}`
      }
    }
  }

  static removeTitle(server: LanguageServer) {
    return `Remove ${server.id}?`
  }

  static removeDescription(server: LanguageServer) {
    return `Deletes version ${server.installedVersion} and its project data. Installing it later downloads it again.`
  }

  static requestFailed(action: LanguageServerRequest, error: unknown) {
    const verb = REQUESTS[action]
    if (error instanceof ApiError && error.status !== null) {
      return `${verb} request failed with status ${error.status}`
    }
    return `${verb} request failed`
  }

  private static megabytes(bytes: number) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`
  }

  private static firstLine(text: string) {
    return text.split('\n')[0]
  }
}
