import { useEffect } from 'react'
import { ResourceStates } from '@/src/lib/async-resource.ts'
import { ChangeSets } from '@/src/lib/change-set.ts'
import { FileNavigationRules } from '@/src/lib/file-navigation.ts'
import { FileOrder } from '@/src/lib/file-order.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'

export const useFileNavigation = () => {
  const { state } = useChangeSet()
  const selectedPath = useNavigationStore((navigation) => {
    return navigation.selectedPath
  })
  const selectFile = useNavigationStore((navigation) => {
    return navigation.selectFile
  })
  const files = FileOrder.ofTree(ResourceStates.dataOr(state, ChangeSets.empty).changes)
  const position = FileNavigationRules.of(files, selectedPath)
  const firstPath = position.current ? null : (files[0]?.path ?? null)

  useEffect(() => {
    if (firstPath) {
      selectFile(firstPath)
    }
  }, [firstPath, selectFile])

  const goTo = (path: string | null) => {
    if (path) {
      selectFile(path)
    }
  }

  return {
    ...position,
    canPrevious: position.previousPath !== null,
    canNext: position.nextPath !== null,
    previous: () => {
      goTo(position.previousPath)
    },
    next: () => {
      goTo(position.nextPath)
    },
  }
}
