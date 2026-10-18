import { ComparisonCache } from '@/src/lib/comparison-cache.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { ReviewComments } from '@/src/lib/review-comments.ts'
import type { ReviewSession, ReviewSessionGateway } from '@/src/lib/review-session-gateway.ts'

export class ReviewSessions {
  private readonly gateway: ReviewSessionGateway
  private readonly comments: ReviewComments
  private readonly cache: ComparisonCache<ReviewSession[]>

  constructor(gateway: ReviewSessionGateway, comments: ReviewComments) {
    this.gateway = gateway
    this.comments = comments
    this.cache = new ComparisonCache((comparison) => {
      return gateway.list(comparison)
    })
  }

  of(comparison: Comparison) {
    return this.cache.get(comparison)
  }

  async finish(comparison: Comparison) {
    const finished = await this.gateway.finish(comparison)
    this.of(comparison).update((sessions) => {
      return [finished, ...sessions]
    })
    this.comments.clear(comparison)
    return finished
  }
}
