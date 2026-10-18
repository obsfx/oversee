import { ApiError, type ApiClient } from './api-client.ts'
import type { BranchGateway, BranchList } from './branch-gateway.ts'

const PATH = '/get-branches'

const parseBranchList = (body: unknown): BranchList => {
  const { branches, current } = (body ?? {}) as Record<string, unknown>
  const isStringList =
    Array.isArray(branches) &&
    branches.every((branch) => {
      return typeof branch === 'string'
    })
  if (!isStringList || typeof current !== 'string') {
    throw new ApiError(PATH, 'unexpected response shape')
  }
  return { branches, current }
}

export class HttpBranchGateway implements BranchGateway {
  private readonly api: ApiClient

  constructor(api: ApiClient) {
    this.api = api
  }

  list() {
    return this.api.get(PATH, parseBranchList)
  }
}
