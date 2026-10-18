import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { ResourceCache } from '@/src/lib/resource-cache.ts'

export class ComparisonCache<T> extends ResourceCache<Comparison, T> {
  constructor(fetcher: (comparison: Comparison) => Promise<T>) {
    super(ComparisonRules.key, fetcher)
  }
}
