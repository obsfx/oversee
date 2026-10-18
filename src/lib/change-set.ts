import { ValueGuards } from '@/src/lib/value-guards.ts'

const CHANGE_STATUSES = ['added', 'modified', 'deleted', 'renamed', 'untracked'] as const

export type ChangeStatus = (typeof CHANGE_STATUSES)[number]

export type FileSide = 'old' | 'new'

export abstract class ChangeStatuses {
  static readonly all: readonly ChangeStatus[] = CHANGE_STATUSES

  static includes(value: unknown): value is ChangeStatus {
    return ValueGuards.isOneOf(ChangeStatuses.all, value)
  }

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
}

export interface ChangeSet {
  changes: FileChange[]
}
