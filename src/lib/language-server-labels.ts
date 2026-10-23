import { ApiError } from '@/src/lib/api-client.ts'
import { KeyboardKeys } from '@/src/lib/keyboard-keys.ts'
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
import { ListLabels } from '@/src/lib/list-labels.ts'

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
    return `Needs ${LanguageServerLabels.tools(blocker)} on PATH`
  }

  private static tools(blocker: Extract<LanguageServerBlocker, { kind: 'missing' }>) {
    return ListLabels.and(
      blocker.tools.map((tool) => {
        const outdated = blocker.outdated.find((candidate) => {
          return candidate.tool === tool
        })
        if (outdated === undefined) {
          return tool
        }
        return `${tool} ${outdated.minimum} or newer`
      }),
    )
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
      const outdated = server.outdated.find((candidate) => {
        return candidate.tool === tool
      })
      let title = missing ? `${tool} is not on PATH` : `${tool} is on PATH`
      if (outdated !== undefined) {
        title = `${tool} ${outdated.found} is on PATH, ${outdated.minimum} or newer is needed`
      }
      return { tool, missing, title }
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
        return `Go to definition is ready for ${notice.fileLabel}`
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
        return `Install ${server.id} ${server.version}, needs ${ListLabels.and(server.requires)}`
      }
      case 'blocked': {
        const blocker = LanguageServerStates.blocker(server)
        if (blocker?.kind === 'missing') {
          return `${server.id} needs ${LanguageServerLabels.tools(blocker)} on PATH`
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
        return `Hold ${KeyboardKeys.display('mod').title} and hover or click a symbol`
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
    return ApiError.describe(error, `${REQUESTS[action]} request`)
  }

  static firstLine(text: string) {
    return text.split('\n')[0]
  }

  private static megabytes(bytes: number) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`
  }
}
