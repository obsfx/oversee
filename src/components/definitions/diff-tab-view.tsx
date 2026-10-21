import { useDiffTab } from '@/src/hooks/use-diff-tab.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { TabResourceView } from '@/src/components/definitions/tab-resource-view.tsx'
import { FileDiffView } from '@/src/components/diff-viewer/file-diff-view.tsx'

export function DiffTabView({ tab }: { tab: DefinitionTab }) {
  const { state, retry } = useDiffTab(tab)

  return (
    <TabResourceView state={state} failure={'Could not load this diff'} onRetry={retry}>
      {(diff) => {
        return <FileDiffView path={tab.path} diff={diff} reveal={tab.reveal} expandUnchanged />
      }}
    </TabResourceView>
  )
}
