import { useServices } from '../context/services/use-services.ts'
import { ComparisonRules, type ComparisonSource } from '../lib/comparison-rules.ts'
import { useComparisonStore } from '../store/comparison-store.ts'
import { useResource } from './use-resource.ts'

export const useComparison = () => {
  const { branches } = useServices()
  const branchesState = useResource(branches)
  const selected = useComparisonStore((state) => {
    return state.selected
  })
  const select = useComparisonStore((state) => {
    return state.select
  })
  const fallback =
    branchesState.status === 'ready' ? ComparisonRules.defaultFor(branchesState.data) : null
  const comparison = selected ?? fallback

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
