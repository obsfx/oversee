import type { DefinitionStatus } from '@/src/lib/definition-gateway.ts'

export type ServerProblemStatus = Extract<
  DefinitionStatus,
  'not-installed' | 'starting' | 'indexing' | 'failed'
>

export abstract class ServerStatusLabels {
  static title(status: ServerProblemStatus, server: string) {
    switch (status) {
      case 'not-installed': {
        return `${server} is not installed`
      }
      case 'starting': {
        return `Starting ${server}`
      }
      case 'indexing': {
        return `${server} is indexing`
      }
      case 'failed': {
        return `${server} failed`
      }
    }
  }
}
