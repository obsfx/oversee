import * as v from 'valibot'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type { BranchGateway } from '@/src/lib/branch-gateway.ts'

export class HttpBranchGateway extends HttpGateway implements BranchGateway {
  private static readonly path = '/api/branches'

  private static readonly body = v.object({
    branches: v.array(v.string()),
    remoteBranches: v.array(v.string()),
    current: v.string(),
  })

  list() {
    return this.api.get(HttpBranchGateway.path, HttpBranchGateway.body)
  }
}
