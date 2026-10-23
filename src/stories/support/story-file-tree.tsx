import { FileTreeView } from '@/src/components/sidebar/file-tree-view.tsx'
import { useFileTree } from '@/src/hooks/use-file-tree.ts'
import type { FileChange } from '@/src/lib/change-set.ts'

export function StoryFileTree({ changes }: { changes: readonly FileChange[] }) {
  const { attachScrollElement, ...tree } = useFileTree(changes)
  return <FileTreeView tree={tree} scroller={attachScrollElement} />
}
