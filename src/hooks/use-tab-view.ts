import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import { type DefinitionTab, DefinitionTabs } from '@/src/lib/definition-tabs.ts'

export const useTabView = () => {
  const { state } = useChangeSet()
  const changes = ResourceStates.dataOr(state, null)?.changes ?? null

  return (tab: DefinitionTab) => {
    return DefinitionTabs.viewOf(tab, changes)
  }
}
