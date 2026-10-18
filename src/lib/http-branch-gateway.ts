import { ApiClient, ApiError } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type { BranchGateway, BranchList } from '@/src/lib/branch-gateway.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export class HttpBranchGateway extends HttpGateway implements BranchGateway {
  private static readonly path = '/get-branches'

  private static parseBranchList(body: unknown): BranchList {
    const { branches, current } = ApiClient.fieldsOf(body)
    if (!ValueGuards.isStringList(branches) || !ValueGuards.isString(current)) {
      throw ApiError.unexpectedShape(HttpBranchGateway.path)
    }
    return { branches, current }
  }

  list() {
    return this.api.get(HttpBranchGateway.path, HttpBranchGateway.parseBranchList)
  }
}
