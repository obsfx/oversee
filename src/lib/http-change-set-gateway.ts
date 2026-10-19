import * as v from 'valibot'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import { ChangeStatuses } from '@/src/lib/change-set.ts'
import type { ChangeSetGateway } from '@/src/lib/change-set-gateway.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import { ValueSchemas } from '@/src/lib/value-schemas.ts'

export class HttpChangeSetGateway extends HttpGateway implements ChangeSetGateway {
  private static readonly path = '/api/file-tree'

  private static readonly body = v.object({
    changes: v.array(
      v.object({
        path: v.string(),
        previousPath: v.optional(v.string()),
        status: ChangeStatuses.schema,
        additions: ValueSchemas.count,
        deletions: ValueSchemas.count,
        revision: v.string(),
      }),
    ),
  })

  load(comparison: Comparison) {
    return this.api.get(
      HttpGateway.comparisonPath(HttpChangeSetGateway.path, comparison),
      HttpChangeSetGateway.body,
    )
  }
}
