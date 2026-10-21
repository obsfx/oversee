import { useChangeSet } from '@/src/hooks/use-change-set.ts'
import { ChangeSets } from '@/src/lib/change-set.ts'
import type { ReviewComment } from '@/src/lib/comment-gateway.ts'
import { CommentLocations } from '@/src/lib/comment-locations.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useTabStore } from '@/src/store/tab-store.ts'

export const useCommentLocationOpener = (onNavigate: () => void) => {
  const { state } = useChangeSet()
  const changes = ChangeSets.changesOf(state)
  const revealLine = useNavigationStore((navigation) => {
    return navigation.revealLine
  })
  const openTab = useTabStore((tabs) => {
    return tabs.open
  })

  return (comment: Pick<ReviewComment, 'filePath' | 'range'>) => {
    const target = CommentLocations.targetOf(comment, changes)
    if (target.kind === 'review') {
      revealLine(target.path, target.side, target.line)
    } else {
      openTab(
        { path: target.path, external: false, side: 'new', line: target.line },
        useTabStore.getState().generation,
      )
    }
    onNavigate()
  }
}
