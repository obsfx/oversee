import { FileTree } from '@pierre/trees'
import { FileTreeAppearance } from '@/src/lib/file-tree-appearance.ts'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'

export const createStoryTree = () => {
  return new FileTree({
    paths: changeSet.changes.map((change) => {
      return change.path
    }),
    gitStatus: changeSet.changes,
    initialExpansion: 'open',
    flattenEmptyDirectories: true,
    search: true,
    fileTreeSearchMode: 'hide-non-matches',
    density: 'compact',
    icons: FileTreeAppearance.icons,
    unsafeCSS: FileTreeAppearance.css,
  })
}
