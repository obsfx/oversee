import { prepareFileTreeInput } from '@pierre/trees'
import type { FileChange } from './change-set.ts'

export abstract class FileOrder {
  static ofTree(changes: readonly FileChange[]): FileChange[] {
    const changesByPath = new Map(
      changes.map((change) => {
        return [change.path, change]
      }),
    )
    const { paths } = prepareFileTreeInput([...changesByPath.keys()], {
      flattenEmptyDirectories: true,
    })
    return paths.flatMap((path) => {
      const change = changesByPath.get(path)
      return change ? [change] : []
    })
  }
}
