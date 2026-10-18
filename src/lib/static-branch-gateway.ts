import type { BranchGateway, BranchList } from './branch-gateway.ts'

export class StaticBranchGateway implements BranchGateway {
  private readonly result: () => Promise<BranchList>

  constructor(result: () => Promise<BranchList>) {
    this.result = result
  }

  list() {
    return this.result()
  }
}
