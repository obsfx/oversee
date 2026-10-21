import { useTabView } from '@/src/hooks/use-tab-view.ts'
import { type DefinitionTabView, DefinitionTabs } from '@/src/lib/definition-tabs.ts'
import { DefinitionLabels } from '@/src/lib/definition-labels.ts'
import { useTabStore } from '@/src/store/tab-store.ts'

export const useActiveTab = () => {
  const active = useTabStore((state) => {
    return DefinitionTabs.active(state)
  })
  const hasTabs = useTabStore((state) => {
    return state.tabs.length > 0
  })
  const viewOf = useTabView()
  let view: DefinitionTabView | null = null
  let label = 'Review'
  if (active) {
    view = viewOf(active)
    label = DefinitionLabels.tabTitle(active)
  }

  return { active, view, hasTabs, label }
}
