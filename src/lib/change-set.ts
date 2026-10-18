const CHANGE_STATUSES = ['added', 'modified', 'deleted', 'renamed', 'untracked'] as const

export type ChangeStatus = (typeof CHANGE_STATUSES)[number]

export abstract class ChangeStatuses {
  static readonly all: readonly ChangeStatus[] = CHANGE_STATUSES

  static includes(value: unknown): value is ChangeStatus {
    return ChangeStatuses.all.some((status) => {
      return status === value
    })
  }
}

export interface FileChange {
  path: string
  status: ChangeStatus
  additions: number
  deletions: number
}

export interface ChangeSet {
  changes: FileChange[]
}
