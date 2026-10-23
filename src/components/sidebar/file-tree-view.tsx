import { ContextMenu } from '@base-ui/react/context-menu'
import { VscCheck } from 'react-icons/vsc'
import type { FileTreeModel } from '@/src/hooks/use-file-tree.ts'
import type { ScrollElementRef } from '@/src/hooks/use-tree-virtualizer.ts'
import { FileKinds } from '@/src/lib/file-kinds.ts'
import { FileTreeLabels } from '@/src/lib/file-tree-labels.ts'
import { FileRow } from '@/src/primitives/file-row.tsx'
import { FolderRow } from '@/src/primitives/folder-row.tsx'
import { MenuItem } from '@/src/primitives/menu-item.tsx'
import { MenuSurface } from '@/src/primitives/menu-surface.tsx'
import { VirtualRow } from '@/src/primitives/virtual-row.tsx'
import { TreeScroller } from '@/src/primitives/tree-scroller.tsx'

interface FileTreeViewProps {
  tree: FileTreeModel
  scroller: ScrollElementRef
}

export function FileTreeView({ tree, scroller }: FileTreeViewProps) {
  'use no memo'
  return (
    <ContextMenu.Root onOpenChange={tree.onMenuOpenChange}>
      <ContextMenu.Trigger
        render={
          <TreeScroller
            ref={scroller}
            aria-label={'Changed files'}
            aria-activedescendant={tree.activeDescendant}
            totalSize={tree.totalSize}
            onKeyDown={tree.onKeyDown}
          />
        }
      >
        {tree.virtualRows.map(({ row, start, position }) => {
          if (row.change === null) {
            return (
              <VirtualRow key={row.key} start={start}>
                <FolderRow
                  id={tree.rowId(row.key)}
                  aria-posinset={position.posInSet}
                  aria-setsize={position.setSize}
                  title={row.key}
                  depth={row.depth}
                  focused={row.key === tree.activeKey}
                  expanded={row.expanded}
                  name={row.name}
                  onToggle={() => {
                    tree.toggle(row)
                  }}
                  onClick={() => {
                    tree.open(row)
                  }}
                />
              </VirtualRow>
            )
          }
          const reviewed = tree.reviewed.has(row.key)
          return (
            <VirtualRow key={row.key} start={start}>
              <FileRow
                id={tree.rowId(row.key)}
                aria-posinset={position.posInSet}
                aria-setsize={position.setSize}
                aria-label={FileTreeLabels.rowLabel(row.name, row.change)}
                title={FileTreeLabels.fileTitle(row.change)}
                depth={row.depth}
                selected={row.key === tree.selectedPath}
                focused={row.key === tree.activeKey}
                reviewed={reviewed}
                kind={FileKinds.of(row.key)}
                status={row.change.status}
                name={row.name}
                additions={row.change.additions}
                deletions={row.change.deletions}
                countsTitle={FileTreeLabels.countsTitle(row.change)}
                onClick={() => {
                  tree.open(row)
                }}
              />
            </VirtualRow>
          )
        })}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className={'z-50'}>
          <ContextMenu.Popup render={<MenuSurface />}>
            {tree.hasMenuFile && (
              <ContextMenu.Item
                nativeButton={true}
                render={<MenuItem />}
                onClick={tree.toggleMenuReviewed}
              >
                <VscCheck className={'text-reviewed'} />
                {tree.menuReviewed ? FileTreeLabels.unmarkReviewed : FileTreeLabels.markReviewed}
              </ContextMenu.Item>
            )}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
