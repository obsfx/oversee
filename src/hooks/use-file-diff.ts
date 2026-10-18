import { useState } from 'react'
import { useServices } from '@/src/context/services/use-services.ts'
import { ChangeSets } from '@/src/lib/change-set.ts'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'
import { useResource } from '@/src/hooks/use-resource.ts'

export interface ShownDiff {
  path: string
  diff: FileDiff
}

export const useFileDiff = () => {
  const { fileDiffs } = useServices()
  const { comparison } = useComparison()
  const { state: changeSetState } = useChangeSet()
  const selectedPath = useNavigationStore((navigation) => {
    return navigation.selectedPath
  })
  const change = ChangeSets.find(
    ResourceStates.dataOr(changeSetState, ChangeSets.empty).changes,
    selectedPath,
  )
  const resource = comparison && change ? fileDiffs.get({ comparison, change }) : null
  const state = useResource(resource)
  const [shown, setShown] = useState<ShownDiff | null>(null)

  if (state.status === 'ready' && change && shown?.diff !== state.data) {
    setShown({ path: change.path, diff: state.data })
  }

  const waitingForChangeSet =
    changeSetState.status === 'loading' || changeSetState.status === 'idle'
  const loading =
    state.status === 'loading' ||
    (resource !== null && state.status === 'idle') ||
    waitingForChangeSet

  const retry = () => {
    void resource?.reload()
  }

  return { change, state, shown: change ? shown : null, loading, retry }
}
