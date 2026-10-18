import type { FileTree as FileTreeModel } from '@pierre/trees'
import { FileTree } from '@pierre/trees/react'
import { VscCheck } from 'react-icons/vsc'
import { FileTreeAppearance } from '../../lib/file-tree-appearance.ts'
import { MenuItem } from '../../primitives/menu-item.tsx'
import { MenuSurface } from '../../primitives/menu-surface.tsx'
import { useReviewStore } from '../../store/review-store.ts'
import { useSettingsStore } from '../../store/settings-store.ts'

export function FileTreeView({ model }: { model: FileTreeModel }) {
  const theme = useSettingsStore((settings) => {
    return settings.theme
  })
  const reviewed = useReviewStore((review) => {
    return review.reviewed
  })
  const toggleReviewed = useReviewStore((review) => {
    return review.toggleReviewed
  })

  return (
    <FileTree
      model={model}
      style={FileTreeAppearance.hostStyle(theme)}
      renderContextMenu={(item, context) => {
        if (item.kind !== 'file') {
          return null
        }
        return (
          <MenuSurface
            className={'fixed'}
            style={{ left: context.anchorRect.left, top: context.anchorRect.bottom }}
          >
            <MenuItem
              onClick={() => {
                toggleReviewed(item.path)
                context.close()
              }}
            >
              <VscCheck className={'text-reviewed'} />
              {reviewed.has(item.path) ? 'Unmark as reviewed' : 'Mark as reviewed'}
            </MenuItem>
          </MenuSurface>
        )
      }}
    />
  )
}
