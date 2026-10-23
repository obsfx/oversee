import * as v from 'valibot'
import { type ResourceState, ResourceStates } from '@/src/lib/async-resource.ts'

const CHANGE_STATUSES = ['added', 'modified', 'deleted', 'renamed', 'untracked'] as const

export type ChangeStatus = (typeof CHANGE_STATUSES)[number]

export type FileSide = 'old' | 'new'

export abstract class ChangeStatuses {
  static readonly schema = v.picklist(CHANGE_STATUSES)

  static hasOldSide(status: ChangeStatus) {
    return status !== 'added' && status !== 'untracked'
  }

  static hasNewSide(status: ChangeStatus) {
    return status !== 'deleted'
  }
}

export interface FileChange {
  path: string
  status: ChangeStatus
  additions: number
  deletions: number
  previousPath?: string
  revision: string
}

export interface ChangeSet {
  changes: FileChange[]
}

export abstract class ChangeSets {
  static readonly empty: ChangeSet = { changes: [] }

  static changesOf(state: ResourceState<ChangeSet>) {
    return ResourceStates.dataOr(state, ChangeSets.empty).changes
  }

  static find(changes: readonly FileChange[], path: string | null) {
    return (
      changes.find((change) => {
        return change.path === path
      }) ?? null
    )
  }

  static findEither(changes: readonly FileChange[], path: string) {
    const current = ChangeSets.find(changes, path)
    if (current !== null) {
      return current
    }
    const renamed = changes.find((change) => {
      return change.previousPath === path
    })
    if (renamed !== undefined) {
      return renamed
    }
    return null
  }
}
