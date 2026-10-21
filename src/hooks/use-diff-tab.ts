import { useFileDiffResource } from '@/src/hooks/use-file-diff-resource.ts'
import type { ResourceState } from '@/src/lib/async-resource.ts'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'

export const useDiffTab = (tab: DefinitionTab) => {
  const { changeSet, resource, state } = useFileDiffResource(tab.path)

  if (changeSet.state.status === 'failed') {
    const failed: ResourceState<FileDiff> = { status: 'failed', error: changeSet.state.error }
    return { state: failed, retry: changeSet.retry }
  }
  return {
    state,
    retry: () => {
      void resource?.reload()
    },
  }
}
