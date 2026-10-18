import { AsyncResource } from '@/src/lib/async-resource.ts'
import type { BranchGateway, BranchList } from '@/src/lib/branch-gateway.ts'
import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { ChangeSetGateway } from '@/src/lib/change-set-gateway.ts'
import type { CommentGateway } from '@/src/lib/comment-gateway.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import {
  type FileDiff,
  type FileDiffGateway,
  type FileDiffRequest,
  FileDiffRequests,
} from '@/src/lib/file-diff-gateway.ts'
import { ResourceCache } from '@/src/lib/resource-cache.ts'
import { ReviewComments } from '@/src/lib/review-comments.ts'

interface Gateways {
  branches: BranchGateway
  comments: CommentGateway
  changeSets: ChangeSetGateway
  fileDiffs: FileDiffGateway
}

export class Services {
  readonly branches: AsyncResource<BranchList>
  readonly comments: ReviewComments
  readonly changeSets: ResourceCache<Comparison, ChangeSet>
  readonly fileDiffs: ResourceCache<FileDiffRequest, FileDiff>

  constructor(gateways: Gateways) {
    this.branches = new AsyncResource(() => {
      return gateways.branches.list()
    })
    this.comments = new ReviewComments(gateways.comments)
    this.changeSets = new ResourceCache(ComparisonRules.key, (comparison) => {
      return gateways.changeSets.load(comparison)
    })
    this.fileDiffs = new ResourceCache(FileDiffRequests.key, (request) => {
      return gateways.fileDiffs.load(request)
    })
  }
}
