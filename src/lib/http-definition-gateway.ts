import { ApiClient } from '@/src/lib/api-client.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import {
  type DefinitionGateway,
  type DefinitionQuery,
  DefinitionShapes,
} from '@/src/lib/definition-gateway.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'

export class HttpDefinitionGateway extends HttpGateway implements DefinitionGateway {
  private static readonly path = '/api/definitions'

  find(query: DefinitionQuery) {
    const params = ComparisonRules.searchParams(query.comparison)
    params.set('side', query.side)
    params.set('path', query.path)
    params.set('line', String(query.line))
    params.set('character', String(query.character))
    return this.api.get(
      ApiClient.withQuery(HttpDefinitionGateway.path, params),
      DefinitionShapes.lookup,
    )
  }
}
