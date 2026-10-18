import { ApiClient, ApiError } from './api-client.ts'
import { type ChangeSet, ChangeStatuses, type FileChange } from './change-set.ts'
import type { ChangeSetGateway } from './change-set-gateway.ts'
import type { Comparison } from './comparison-rules.ts'

const PATH = '/get-file-tree'
const UNCOMMITTED_REF = ':uncommitted'

const isCount = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

const isFileChange = (value: unknown): value is FileChange => {
  const { path, status, additions, deletions } = ApiClient.fieldsOf(value)
  return (
    typeof path === 'string' &&
    ChangeStatuses.includes(status) &&
    isCount(additions) &&
    isCount(deletions)
  )
}

const parseChangeSet = (body: unknown): ChangeSet => {
  const { changes } = ApiClient.fieldsOf(body)
  if (!Array.isArray(changes) || !changes.every(isFileChange)) {
    throw ApiError.unexpectedShape(PATH)
  }
  return {
    changes: changes.map((change) => {
      return {
        path: change.path,
        status: change.status,
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
