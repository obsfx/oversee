import { AsyncResource } from './async-resource.ts'
import type { BranchGateway, BranchList } from './branch-gateway.ts'
import type { CommentGateway, ReviewComment } from './comment-gateway.ts'

interface Gateways {
  branches: BranchGateway
  comments: CommentGateway
}

export class Services {
  readonly branches: AsyncResource<BranchList>
  readonly comments: AsyncResource<ReviewComment[]>

  constructor(gateways: Gateways) {
    this.branches = new AsyncResource(() => {
      return gateways.branches.list()
    })
    this.comments = new AsyncResource(() => {
      return gateways.comments.list()
    })
  }
}
