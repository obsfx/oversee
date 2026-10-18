export interface WorkspaceInfo {
  name: string
  repoName?: string
  path: string
}

export interface WorkspaceGateway {
  load(): Promise<WorkspaceInfo>
}
