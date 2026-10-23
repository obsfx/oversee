import * as v from 'valibot'
import { CallFlowShapes } from '@/src/lib/call-flow.ts'
import type { ChangeFlowGateway } from '@/src/lib/change-flow-gateway.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import { DefinitionShapes } from '@/src/lib/definition-gateway.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'

export class HttpChangeFlowGateway extends HttpGateway implements ChangeFlowGateway {
  private static readonly path = '/api/change-flow'

  private static readonly body = v.pipe(
    v.object({
      servers: v.array(
        v.object({
          server: v.string(),
          status: DefinitionShapes.status,
          error: v.fallback(v.string(), ''),
        }),
      ),
      nodes: v.array(CallFlowShapes.node),
      edges: v.array(CallFlowShapes.edge),
      origins: v.record(v.string(), v.array(CallFlowShapes.origin)),
    }),
    v.transform(({ servers, nodes, edges, origins }) => {
      return { servers, graph: { nodes, edges, origins } }
    }),
  )

  load(comparison: Comparison) {
    return this.api.get(
      HttpGateway.comparisonPath(HttpChangeFlowGateway.path, comparison),
      HttpChangeFlowGateway.body,
    )
  }
}
