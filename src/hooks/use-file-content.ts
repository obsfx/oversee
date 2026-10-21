import { useServices } from '@/src/context/services/use-services.ts'
import { useResource } from '@/src/hooks/use-resource.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'

export const useFileContent = (tab: DefinitionTab) => {
  const services = useServices()
  const resource = services.fileContents.get({ path: tab.path, external: tab.external })
  const state = useResource(resource)

  return {
    state,
    retry: () => {
      void resource.reload()
    },
  }
}
