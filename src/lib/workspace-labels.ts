import type { WorkspaceInfo } from '@/src/lib/workspace-gateway.ts'

export abstract class WorkspaceLabels {
  private static readonly appName = 'oversee'

  static documentTitle(workspace: WorkspaceInfo | null) {
    if (!workspace) {
      return WorkspaceLabels.appName
    }
    return `${workspace.name} - ${WorkspaceLabels.appName}`
  }
}
