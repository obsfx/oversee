import { useState } from 'react'
import { DiffLineReveal } from '@/src/lib/diff-line-reveal.ts'
import type { FileDiff } from '@/src/lib/file-diff-gateway.ts'
import { ParsedDiffs } from '@/src/lib/parsed-diffs.ts'
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
  const reveal = useNavigationStore((navigation) => {
    return navigation.reveal
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

  const shownNow = change ? shown : null
  let shownReveal = null
  let expandUnchanged = false
  if (reveal && shownNow?.path === reveal.path && !shownNow.diff.binary) {
    shownReveal = reveal
    const metadata = ParsedDiffs.of(shownNow.path, shownNow.diff)
    expandUnchanged = !DiffLineReveal.isInHunk(metadata, reveal.side, reveal.line)
  }

  return {
    change,
    state,
    shown: shownNow,
    reveal: shownReveal,
    expandUnchanged,
    loading,
    retry,
    refresh,
  }
}
