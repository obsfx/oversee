import * as v from 'valibot'
import { ApiClient } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import type { WorkspaceGateway } from '@/src/lib/workspace-gateway.ts'

export class HttpWorkspaceGateway extends HttpGateway implements WorkspaceGateway {
  private static readonly path = '/api/workspace'
  private static readonly injectedPath = 'window.__overseeGlobal.workspace'
  private readonly injected: unknown

  private static readonly body = v.object({
    name: v.string(),
    repoName: v.optional(v.string()),
    path: v.string(),
  })

  constructor(api: ApiClient, injected: unknown) {
    super(api)
    this.injected = injected
  }

  load() {
    if (this.injected !== undefined) {
      return Promise.resolve().then(() => {
        return ApiClient.parse(
          HttpWorkspaceGateway.body,
          this.injected,
          HttpWorkspaceGateway.injectedPath,
        )
      })
    }
    return this.api.get(HttpWorkspaceGateway.path, HttpWorkspaceGateway.body)
  }
}
