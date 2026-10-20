import { useServices } from '@/src/context/services/use-services.ts'
import { useResource } from '@/src/hooks/use-resource.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import type { LanguageServer } from '@/src/lib/language-server-gateway.ts'

const NO_SERVERS: LanguageServer[] = []

export const useLanguageServers = () => {
  const services = useServices()
  const state = useResource(services.languageServers.list)
  const list = ResourceStates.dataOr(state, null)

  return {
    state,
    list,
    servers: list?.servers ?? NO_SERVERS,
    platform: list?.platform ?? '',
  }
}
