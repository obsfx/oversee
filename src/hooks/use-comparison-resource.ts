import { useServices } from '@/src/context/services/use-services.ts'
import type { AsyncResource, ResourceState } from '@/src/lib/async-resource.ts'
import type { Comparison } from '@/src/lib/comparison-rules.ts'
import type { Services } from '@/src/lib/services.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { useResource } from '@/src/hooks/use-resource.ts'

export const useComparisonResource = <T>(
  resourceOf: (services: Services, comparison: Comparison) => AsyncResource<T>,
) => {
  const services = useServices()
  const { branchesState, comparison, retry: retryBranches } = useComparison()
  const resource = comparison ? resourceOf(services, comparison) : null
  const resourceState = useResource(resource)
  let state: ResourceState<T> = resourceState
  if (!comparison && branchesState.status === 'failed') {
    state = { status: 'failed', error: branchesState.error }
  }

  const retry = () => {
    if (resource) {
      void resource.reload()
    } else {
      retryBranches()
    }
  }

  return { state, comparison, resource, retry }
}
