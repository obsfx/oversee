import { ApiClient } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type { BranchGateway, BranchList } from '@/src/lib/branch-gateway.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export class HttpBranchGateway extends HttpGateway implements BranchGateway {
  private static readonly path = '/api/branches'

  private static parseBranchList(body: unknown): BranchList {
    const { path } = HttpBranchGateway
    return {
      branches: ApiClient.field(body, 'branches', ValueGuards.isStringList, path),
      remoteBranches: ApiClient.field(body, 'remoteBranches', ValueGuards.isStringList, path),
      current: ApiClient.field(body, 'current', ValueGuards.isString, path),
    }
  }

  list() {
    return this.api.get(HttpBranchGateway.path, HttpBranchGateway.parseBranchList)
  }
}
