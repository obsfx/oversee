import { useServices } from '@/src/context/services/use-services.ts'
import { useResource } from '@/src/hooks/use-resource.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'

export const useWorkspace = () => {
  const { workspace } = useServices()
  const state = useResource(workspace)
  return ResourceStates.dataOr(state, null)
}
