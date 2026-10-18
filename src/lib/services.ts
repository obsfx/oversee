import { AsyncResource } from './async-resource.ts'
import type { BranchGateway, BranchList } from './branch-gateway.ts'
import type { ChangeSet } from './change-set.ts'
import type { ChangeSetGateway } from './change-set-gateway.ts'
import type { CommentGateway, ReviewComment } from './comment-gateway.ts'
import { ComparisonRules, type Comparison } from './comparison-rules.ts'
import { ResourceCache } from './resource-cache.ts'

interface Gateways {
  branches: BranchGateway
  comments: CommentGateway
  changeSets: ChangeSetGateway
}

export class Services {
  readonly branches: AsyncResource<BranchList>
  readonly comments: AsyncResource<ReviewComment[]>
  readonly changeSets: ResourceCache<Comparison, ChangeSet>

  constructor(gateways: Gateways) {
    this.branches = new AsyncResource(() => {
      return gateways.branches.list()
    })
    this.comments = new AsyncResource(() => {
      return gateways.comments.list()
    })
    this.changeSets = new ResourceCache(ComparisonRules.key, (comparison) => {
      return gateways.changeSets.load(comparison)
    })
  }
}
