import { useState } from 'react'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useFileDiffResource } from '@/src/hooks/use-file-diff-resource.ts'

export interface ShownDiff {
  path: string
  diff: FileDiff
}

export const useFileDiff = () => {
  const selectedPath = useNavigationStore((navigation) => {
    return navigation.selectedPath
  })
  const { changeSet, change, resource, state } = useFileDiffResource(selectedPath)
  const [shown, setShown] = useState<ShownDiff | null>(null)

  if (state.status === 'ready' && change && shown?.diff !== state.data) {
    setShown({ path: change.path, diff: state.data })
  }

  const waitingForChangeSet =
    changeSet.state.status === 'loading' || changeSet.state.status === 'idle'
  const loading =
    state.status === 'loading' ||
    (resource !== null && state.status === 'idle') ||
    waitingForChangeSet

  const retry = () => {
    void resource?.reload()
  }

  const refresh = () => {
    void resource?.refresh()
  }

  return { change, state, shown: change ? shown : null, loading, retry, refresh }
}
