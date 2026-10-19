import { useServices } from '@/src/context/services/use-services.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import { ComparisonRules, type ComparisonSource } from '@/src/lib/comparison-rules.ts'
import { useComparisonStore } from '@/src/store/comparison-store.ts'
import { useResource } from '@/src/hooks/use-resource.ts'

export const useComparison = () => {
  const { branches } = useServices()
  const branchesState = useResource(branches)
  const selected = useComparisonStore((state) => {
    return state.selected
  })
  const select = useComparisonStore((state) => {
    return state.select
  })
  const comparison = ComparisonRules.resolve(selected, ResourceStates.dataOr(branchesState, null))

  const selectSource = (source: ComparisonSource) => {
    if (comparison) {
      select({ ...comparison, source })
    }
  }

  const selectTarget = (target: string) => {
    if (comparison) {
      select({ ...comparison, target })
    }
  }

  const retry = () => {
    void branches.reload()
  }

  return { branchesState, comparison, selectSource, selectTarget, retry }
}
