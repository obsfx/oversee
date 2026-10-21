import { useEffect, useState } from 'react'
import { ChangeSets } from '@/src/lib/change-set.ts'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { type FileAnchor, FileNavigationRules } from '@/src/lib/file-navigation.ts'
import { FileOrder } from '@/src/lib/file-order.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { useComparison } from '@/src/hooks/use-comparison.ts'

export const useFileNavigation = () => {
  const { state } = useChangeSet()
  const { comparison } = useComparison()
  const selectedPath = useNavigationStore((navigation) => {
    return navigation.selectedPath
  })
  const selectFile = useNavigationStore((navigation) => {
    return navigation.selectFile
  })
  const followFile = useNavigationStore((navigation) => {
    return navigation.followFile
  })
  const [anchor, setAnchor] = useState<FileAnchor | null>(null)
  const files = FileOrder.ofTree(ChangeSets.changesOf(state))
  const position = FileNavigationRules.of(files, selectedPath)
  const comparisonKey = comparison ? ComparisonRules.key(comparison) : null
  const currentAnchor = FileNavigationRules.anchor(position, comparisonKey)

  if (currentAnchor && !FileNavigationRules.sameAnchor(anchor, currentAnchor)) {
    setAnchor(currentAnchor)
  }

  const fallbackPath = FileNavigationRules.fallbackPath(files, position, anchor, comparisonKey)

  useEffect(() => {
    if (fallbackPath) {
      followFile(fallbackPath)
    }
  }, [fallbackPath, followFile])

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
