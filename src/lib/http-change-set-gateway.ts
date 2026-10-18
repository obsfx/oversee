import { ApiError, type ApiClient } from './api-client.ts'
import type { ChangeSet, ChangeStatus, FileChange } from './change-set.ts'
import type { ChangeSetGateway } from './change-set-gateway.ts'
import type { Comparison } from './comparison-rules.ts'

const PATH = '/get-file-tree'
const UNCOMMITTED_REF = ':uncommitted'
const STATUSES = new Set<string>(['added', 'modified', 'deleted', 'renamed', 'untracked'])

const isCount = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

const isFileChange = (value: unknown): value is FileChange => {
  const { path, status, additions, deletions } = (value ?? {}) as Record<string, unknown>
  return (
    typeof path === 'string' &&
    typeof status === 'string' &&
    STATUSES.has(status) &&
    isCount(additions) &&
    isCount(deletions)
  )
}

const parseChangeSet = (body: unknown): ChangeSet => {
  const { changes } = (body ?? {}) as Record<string, unknown>
  if (!Array.isArray(changes) || !changes.every(isFileChange)) {
    throw new ApiError(PATH, 'unexpected response shape')
  }
  return {
    changes: changes.map((change) => {
      return {
        path: change.path,
        status: change.status as ChangeStatus,
        additions: change.additions,
        deletions: change.deletions,
      }
    }),
  }
}

export class HttpChangeSetGateway implements ChangeSetGateway {
  private readonly api: ApiClient

  constructor(api: ApiClient) {
    this.api = api
  }

  load({ source, target }: Comparison) {
    const query = new URLSearchParams({
      source: source.kind === 'branch' ? source.name : UNCOMMITTED_REF,
      target,
    })
    return this.api.get(`${PATH}?${query.toString()}`, parseChangeSet)
  }
}
