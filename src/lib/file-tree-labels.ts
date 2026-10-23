import type { ChangeStatus, FileChange } from '@/src/lib/change-set.ts'
import { CountLabels } from '@/src/lib/count-labels.ts'
import { TextQueries } from '@/src/lib/text-queries.ts'

const STATUSES: Record<ChangeStatus, string> = {
  added: 'Added',
  modified: 'Modified',
  deleted: 'Deleted',
  renamed: 'Renamed',
  untracked: 'Untracked',
}

export abstract class FileTreeLabels {
  static readonly markReviewed = 'Mark as reviewed'

  static readonly unmarkReviewed = 'Unmark as reviewed'

  static readonly reviewed = 'Reviewed'

  static readonly loading = 'Loading files'

  static readonly failed = 'Could not load files'

  static readonly empty = 'No changed files'

  static readonly filter = 'Filter files'

  static readonly noMatch = 'No files match the filter'

  static readonly allHidden = 'All files are reviewed and hidden'

  static noRows(query: string) {
    if (TextQueries.isActive(query)) {
      return FileTreeLabels.noMatch
    }
    return FileTreeLabels.allHidden
  }

  static status(status: ChangeStatus) {
    return STATUSES[status]
  }

  static countsTitle(change: FileChange) {
    return `${CountLabels.of(change.additions, 'line')} added, ${change.deletions} removed`
  }

  static rowLabel(name: string, change: FileChange) {
    return `${name}, ${FileTreeLabels.status(change.status)}, ${FileTreeLabels.countsTitle(change)}`
  }

  static fileTitle(change: FileChange) {
    if (change.previousPath !== undefined) {
      return `${change.path}, renamed from ${change.previousPath}`
    }
    return `${change.path}, ${FileTreeLabels.status(change.status).toLowerCase()}`
  }
}
