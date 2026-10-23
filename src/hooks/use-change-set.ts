import { useComparisonResource } from '@/src/hooks/use-comparison-resource.ts'

export const useChangeSet = () => {
  const { state, retry } = useComparisonResource(({ changeSets }, comparison) => {
    return changeSets.get(comparison)
  })

  return { state, retry }
}
