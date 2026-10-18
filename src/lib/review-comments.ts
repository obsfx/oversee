import type { CommentGateway, NewComment, ReviewComment } from '@/src/lib/comment-gateway.ts'
import { CommentLists } from '@/src/lib/comment-lists.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { ResourceCache } from '@/src/lib/resource-cache.ts'

export class ReviewComments {
  private readonly gateway: CommentGateway
  private readonly cache: ResourceCache<Comparison, ReviewComment[]>

  constructor(gateway: CommentGateway) {
    this.gateway = gateway
    this.cache = new ResourceCache(ComparisonRules.key, (comparison) => {
      return gateway.list(comparison)
    })
  }

  of(comparison: Comparison) {
    return this.cache.get(comparison)
  }

  async create(comparison: Comparison, input: NewComment) {
    const created = await this.gateway.create(comparison, input)
    this.of(comparison).update((comments) => {
      return [...comments, created]
    })
    return created
  }

  async update(comparison: Comparison, id: string, body: string) {
    const updated = await this.gateway.update(id, body)
    this.of(comparison).update((comments) => {
      return CommentLists.replace(comments, updated)
    })
    return updated
  }

  async remove(comparison: Comparison, id: string) {
    await this.gateway.remove(id)
    this.of(comparison).update((comments) => {
      return CommentLists.without(comments, id)
    })
  }
}
