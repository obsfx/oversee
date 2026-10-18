import { useServices } from '../context/services/use-services.ts'
import type { ResourceState } from '../lib/async-resource.ts'
import type { ChangeSet } from '../lib/change-set.ts'
import { useComparison } from './use-comparison.ts'
import { useResource } from './use-resource.ts'

export const useChangeSet = () => {
  const { changeSets } = useServices()
  const { branchesState, comparison, retry: retryBranches } = useComparison()
  const resource = comparison ? changeSets.get(comparison) : null
  const resourceState = useResource(resource)
  const state: ResourceState<ChangeSet> =
    !comparison && branchesState.status === 'failed'
      ? { status: 'failed', error: branchesState.error }
      : resourceState

  const retry = () => {
    if (resource) {
      void resource.reload()
    } else {
      retryBranches()
    }
  }

  return { state, retry }
}
