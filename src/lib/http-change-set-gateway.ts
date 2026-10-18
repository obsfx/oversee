import { ApiClient } from '@/src/lib/api-client.ts'
import { HttpGateway } from '@/src/lib/http-gateway.ts'
import { type ChangeSet, ChangeStatuses, type FileChange } from '@/src/lib/change-set.ts'
import type { ChangeSetGateway } from '@/src/lib/change-set-gateway.ts'
import { ComparisonRules, type Comparison } from '@/src/lib/comparison-rules.ts'
import { ValueGuards } from '@/src/lib/value-guards.ts'

export class HttpChangeSetGateway extends HttpGateway implements ChangeSetGateway {
  private static readonly path = '/api/file-tree'

  private static isFileChange(value: unknown): value is FileChange {
    const { path, status, additions, deletions, previousPath } = ApiClient.fieldsOf(value)
    return (
      ValueGuards.isString(path) &&
      ValueGuards.isOptionalString(previousPath) &&
      ChangeStatuses.includes(status) &&
      ValueGuards.isCount(additions) &&
      ValueGuards.isCount(deletions)
    )
  }

  private static toFileChange({ path, status, additions, deletions, previousPath }: FileChange) {
    const change: FileChange = { path, status, additions, deletions }
    if (previousPath !== undefined) {
      change.previousPath = previousPath
    }
    return change
  }

  private static isChangeList(value: unknown): value is FileChange[] {
    return ValueGuards.isListOf(value, HttpChangeSetGateway.isFileChange)
  }

  private static parseChangeSet(body: unknown): ChangeSet {
    const changes = ApiClient.field(
      body,
      'changes',
      HttpChangeSetGateway.isChangeList,
      HttpChangeSetGateway.path,
    )
    return { changes: changes.map(HttpChangeSetGateway.toFileChange) }
  }

  load(comparison: Comparison) {
    return this.api.get(
      ApiClient.withQuery(HttpChangeSetGateway.path, ComparisonRules.searchParams(comparison)),
      HttpChangeSetGateway.parseChangeSet,
    )
  }
}
