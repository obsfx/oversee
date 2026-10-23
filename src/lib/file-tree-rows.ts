import type { FileChange } from '@/src/lib/change-set.ts'
import { PathParts } from '@/src/lib/path-parts.ts'
import { TextQueries } from '@/src/lib/text-queries.ts'

export interface FileTreeRow {
  key: string
  type: 'folder' | 'file'
  name: string
  depth: number
  parentKey: string | null
  change: FileChange | null
  expandable: boolean
  expanded: boolean
}

export interface FileTreeOptions {
  collapsed: ReadonlySet<string>
  query: string
}

interface FolderNode {
  name: string
  path: string
  folders: Map<string, FolderNode>
  files: FileChange[]
}

interface EmitContext {
  collapsed: ReadonlySet<string>
  open: boolean
  rows: FileTreeRow[]
}

export abstract class FileTreeRows {
  static rows(changes: readonly FileChange[], { collapsed, query }: FileTreeOptions) {
    const shown = changes.filter((change) => {
      return PathParts.matches(change.path, query)
    })
    const context: EmitContext = { collapsed, open: TextQueries.isActive(query), rows: [] }
    FileTreeRows.emit(FileTreeRows.folderTree(shown), 0, null, context)
    return context.rows
  }

  static files(changes: readonly FileChange[]) {
    return FileTreeRows.all(changes).flatMap((row) => {
      return row.change === null ? [] : [row.change]
    })
  }

  static folderKeys(changes: readonly FileChange[]) {
    return FileTreeRows.all(changes)
      .filter((row) => {
        return row.type === 'folder'
      })
      .map((row) => {
        return row.key
      })
  }

  static revealed(collapsed: ReadonlySet<string>, path: string): ReadonlySet<string> {
    const kept = [...collapsed].filter((key) => {
      return !path.startsWith(key)
    })
    if (kept.length === collapsed.size) {
      return collapsed
    }
    return new Set(kept)
  }

  static ancestorKeys(path: string) {
    const keys: string[] = []
    let cut = path.lastIndexOf('/', path.length - 2)
    while (cut > 0) {
      keys.push(path.slice(0, cut + 1))
      cut = path.lastIndexOf('/', cut - 1)
    }
    return keys
  }

  private static all(changes: readonly FileChange[]) {
    const context: EmitContext = { collapsed: new Set(), open: true, rows: [] }
    FileTreeRows.emit(FileTreeRows.folderTree(changes), 0, null, context)
    return context.rows
  }

  private static folderTree(changes: readonly FileChange[]) {
    const root: FolderNode = { name: '', path: '', folders: new Map(), files: [] }
    for (const change of changes) {
      const segments = change.path.split('/')
      let node = root
      for (const segment of segments.slice(0, -1)) {
        let next = node.folders.get(segment)
        if (next === undefined) {
          const path = node.path === '' ? segment : `${node.path}/${segment}`
          next = { name: segment, path, folders: new Map(), files: [] }
          node.folders.set(segment, next)
        }
        node = next
      }
      node.files.push(change)
    }
    return root
  }

  private static compressed(folder: FolderNode) {
    let node = folder
    let name = folder.name
    while (node.files.length === 0 && node.folders.size === 1) {
      const [only] = node.folders.values()
      name = `${name}/${only.name}`
      node = only
    }
    return { node, name }
  }

  private static emit(
    node: FolderNode,
    depth: number,
    parentKey: string | null,
    context: EmitContext,
  ) {
    const folders = [...node.folders.values()].sort((left, right) => {
      return left.name.localeCompare(right.name)
    })
    for (const folder of folders) {
      const { node: target, name } = FileTreeRows.compressed(folder)
      const key = `${target.path}/`
      const expanded = context.open || !context.collapsed.has(key)
      context.rows.push({
        key,
        type: 'folder',
        name,
        depth,
        parentKey,
        change: null,
        expandable: true,
        expanded,
      })
      if (expanded) {
        FileTreeRows.emit(target, depth + 1, key, context)
      }
    }
    const files = [...node.files].sort((left, right) => {
      return left.path.localeCompare(right.path)
    })
    for (const change of files) {
      context.rows.push({
        key: change.path,
        type: 'file',
        name: PathParts.name(change.path),
        depth,
        parentKey,
        change,
        expandable: false,
        expanded: false,
      })
    }
  }
}
