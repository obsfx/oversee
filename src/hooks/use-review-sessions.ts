import { useServices } from '@/src/context/services/use-services.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { useResource } from '@/src/hooks/use-resource.ts'

export const useReviewSessions = () => {
  const { sessions } = useServices()
  const { comparison } = useComparison()
  const state = useResource(comparison ? sessions.of(comparison) : null)
  const list = ResourceStates.dataOr(state, [])

  return { state, list }
}
