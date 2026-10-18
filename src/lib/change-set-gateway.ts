import type { ChangeSet } from '@/src/lib/change-set.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'

export interface ChangeSetGateway {
  load(comparison: Comparison): Promise<ChangeSet>
}
