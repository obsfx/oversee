import { ResourceStates, type AsyncResource, type ResourceState } from '@/src/lib/async-resource.ts'
import type { WorkspaceInfo } from '@/src/lib/workspace-gateway.ts'
import { WorkspaceLabels } from '@/src/lib/workspace-labels.ts'

export class DocumentTitleSync {
  private readonly workspace: AsyncResource<WorkspaceInfo>

  constructor(workspace: AsyncResource<WorkspaceInfo>) {
    this.workspace = workspace
  }

  private static apply(state: ResourceState<WorkspaceInfo>) {
    document.title = WorkspaceLabels.documentTitle(ResourceStates.dataOr(state, null))
  }

  start() {
    void this.workspace.load()
    DocumentTitleSync.apply(this.workspace.store.getState())
    return this.workspace.store.subscribe(DocumentTitleSync.apply)
  }
}
