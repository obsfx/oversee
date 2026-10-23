import { useComparisonResource } from '@/src/hooks/use-comparison-resource.ts'

export const useCallFlow = () => {
  const { state, comparison, resource, retry } = useComparisonResource(
    ({ changeFlows }, selected) => {
      return changeFlows.get(selected)
    },
  )

  const refresh = () => {
    void resource?.refresh()
  }

  return { state, comparison, retry, refresh }
}
