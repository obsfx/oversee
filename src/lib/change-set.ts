export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'

export interface FileChange {
  path: string
  status: ChangeStatus
  additions: number
  deletions: number
}

export interface ChangeSet {
  changes: FileChange[]
}
