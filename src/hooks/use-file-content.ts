import { useServices } from '@/src/context/services/use-services.ts'
import { useResource } from '@/src/hooks/use-resource.ts'
import { ApiError } from '@/src/lib/api-client.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { DefinitionLabels } from '@/src/lib/definition-labels.ts'

export const useFileContent = (tab: DefinitionTab) => {
  const services = useServices()
  const resource = services.fileContents.get({ path: tab.path, external: tab.external })
  const state = useResource(resource)
  let missing = null
  if (state.status === 'failed' && !tab.external && ApiError.isNotFound(state.error)) {
    missing = DefinitionLabels.missing(tab)
  }

  return {
    state,
    missing,
    retry: () => {
      void resource.reload()
    },
  }
}
