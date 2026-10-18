export interface BranchList {
  branches: string[]
  remoteBranches: string[]
  current: string
}

export interface BranchGateway {
  list(): Promise<BranchList>
}
