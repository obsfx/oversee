import type { ChangeSet } from './change-set.ts'
import type { ChangeSetGateway } from './change-set-gateway.ts'
import type { Comparison } from './comparison-rules.ts'

export class StaticChangeSetGateway implements ChangeSetGateway {
  private readonly result: (comparison: Comparison) => Promise<ChangeSet>

  constructor(result: (comparison: Comparison) => Promise<ChangeSet>) {
    this.result = result
  }

  load(comparison: Comparison) {
    return this.result(comparison)
  }
}
