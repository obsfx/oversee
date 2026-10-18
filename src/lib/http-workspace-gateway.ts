import { ApiClient } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'
import type { WorkspaceGateway, WorkspaceInfo } from '@/src/lib/workspace-gateway.ts'

export class HttpWorkspaceGateway extends HttpGateway implements WorkspaceGateway {
  private static readonly path = '/api/workspace'
  private static readonly injectedPath = 'window.__overseeGlobal.workspace'
  private readonly injected: unknown

  constructor(api: ApiClient, injected: unknown) {
    super(api)
    this.injected = injected
  }

  private static parseWorkspace(body: unknown, path: string): WorkspaceInfo {
    return {
      name: ApiClient.field(body, 'name', ValueGuards.isString, path),
      repoName: ApiClient.field(body, 'repoName', ValueGuards.isOptionalString, path),
      path: ApiClient.field(body, 'path', ValueGuards.isString, path),
    }
  }

  load() {
    if (this.injected !== undefined) {
      return Promise.resolve().then(() => {
        return HttpWorkspaceGateway.parseWorkspace(this.injected, HttpWorkspaceGateway.injectedPath)
      })
    }
    return this.api.get(HttpWorkspaceGateway.path, (body) => {
      return HttpWorkspaceGateway.parseWorkspace(body, HttpWorkspaceGateway.path)
    })
  }
}
