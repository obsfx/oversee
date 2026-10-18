export interface BranchList {
  branches: string[]
  current: string
}

export interface BranchGateway {
  list(): Promise<BranchList>
}
