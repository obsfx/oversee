import { ApiClient } from '@/src/lib/api-client.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'

export abstract class HttpGateway {
  protected readonly api: ApiClient
  private revision = 0

  constructor(api: ApiClient) {
    this.api = api
  }

  protected revisionKey(key: string) {
    this.revision += 1
    return `${key}::${this.revision}`
  }

  protected static comparisonPath(path: string, comparison: Comparison) {
    return ApiClient.withQuery(path, ComparisonRules.searchParams(comparison))
  }

  protected static resourcePath(path: string, id: string) {
    return `${path}/${encodeURIComponent(id)}`
  }
}
