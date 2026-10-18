import type { ChangeSet } from './change-set.ts'
import type { Comparison } from './comparison-rules.ts'

export interface ChangeSetGateway {
  load(comparison: Comparison): Promise<ChangeSet>
}
