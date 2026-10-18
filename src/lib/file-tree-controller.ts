import type { FileTree, FileTreeOptions } from '@pierre/trees'
import type { FileChange } from './change-set.ts'
import { FileTreeAppearance } from './file-tree-appearance.ts'
import { TreePaths } from './tree-paths.ts'

export interface FileTreeInput {
  paths: readonly string[]
  changes: readonly FileChange[]
}

export interface FileTreeHandlers {
  isReviewed: (path: string) => boolean
  onSelectFile: (path: string) => void
}

const pathsKeyOf = (paths: readonly string[]) => {
  return paths.join('\n')
}

const changesKeyOf = (changes: readonly FileChange[]) => {
  return changes
    .map((change) => {
      return `${change.status}:${change.path}`
    })
    .join('\n')
}

export class FileTreeController {
  readonly model: FileTree
  private paths: readonly string[]
  private pathsKey: string
  private changesKey: string

  static createOptions(
    { paths, changes }: FileTreeInput,
    handlers: FileTreeHandlers,
  ): FileTreeOptions {
    return {
      paths,
      gitStatus: changes,
      initialExpansion: 'open',
      flattenEmptyDirectories: true,
      search: true,
      fileTreeSearchMode: 'hide-non-matches',
      density: 'compact',
      icons: FileTreeAppearance.icons,
      unsafeCSS: FileTreeAppearance.css,
      renderRowDecoration: ({ item }) => {
        if (item.kind !== 'file' || !handlers.isReviewed(item.path)) {
          return null
        }
        return { icon: FileTreeAppearance.reviewedIcon, title: 'Reviewed' }
      },
      onSelectionChange: (selected) => {
        const path = TreePaths.singleFile(selected)
        if (path) {
          handlers.onSelectFile(path)
        }
      },
    }
  }

  constructor(model: FileTree, { paths, changes }: FileTreeInput) {
    this.model = model
    this.paths = paths
    this.pathsKey = pathsKeyOf(paths)
    this.changesKey = changesKeyOf(changes)
  }

  syncPaths(paths: readonly string[]) {
    const pathsKey = pathsKeyOf(paths)
    if (pathsKey === this.pathsKey) {
      return
    }
    this.paths = paths
    this.pathsKey = pathsKey
    this.model.resetPaths(paths, { initialExpandedPaths: TreePaths.directoriesOf(paths) })
  }

  syncChanges(changes: readonly FileChange[]) {
    const changesKey = changesKeyOf(changes)
    if (changesKey === this.changesKey) {
      return
    }
    this.changesKey = changesKey
    this.model.setGitStatus(changes)
  }

  refreshDecorations() {
    this.model.setComposition(this.model.getComposition())
  }

  reveal(path: string | null) {
    if (!path || this.model.getSelectedPaths().includes(path)) {
      return
    }
    for (const selected of this.model.getSelectedPaths()) {
      this.model.getItem(selected)?.deselect()
    }
    this.model.getItem(path)?.select()
    this.model.scrollToPath(path, { offset: 'nearest' })
  }

  setExpanded(expanded: boolean) {
    const directories = TreePaths.directoriesOf(this.paths).sort((left, right) => {
      return expanded ? left.length - right.length : right.length - left.length
    })
    for (const directory of directories) {
      const item = this.model.getItem(directory)
      if (!item || !('expand' in item)) {
        continue
      }
      if (expanded) {
        item.expand()
      } else {
        item.collapse()
      }
    }
  }
}
