import { useServices } from '@/src/context/services/use-services.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import {
  type Definition,
  type DefinitionLookup,
  DefinitionQueries,
} from '@/src/lib/definition-gateway.ts'
import type { HoverToken } from '@/src/lib/definition-hover.ts'
import { useTabStore } from '@/src/store/tab-store.ts'

export const useDefinitionNavigation = () => {
  const services = useServices()
  const { comparison } = useComparison()
  const openTab = useTabStore((tabs) => {
    return tabs.open
  })

  const open = (definition: Definition) => {
    openTab(definition, useTabStore.getState().generation)
  }

  const navigate = async (token: HoverToken) => {
    if (!comparison) {
      return true
    }
    const generation = useTabStore.getState().generation
    let lookup: DefinitionLookup
    try {
      lookup = await services.definitions.find(DefinitionQueries.of(comparison, token))
    } catch {
      return false
    }
    const first = lookup.definitions.at(0)
    if (!first) {
      return false
    }
    openTab(first, generation)
    return true
  }

  return { open, navigate }
}
