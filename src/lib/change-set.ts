import * as v from 'valibot'

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

  static find(changes: readonly FileChange[], path: string | null) {
    return (
      changes.find((change) => {
        return change.path === path
      }) ?? null
    )
  }
}
