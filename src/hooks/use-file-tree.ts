import type { ContextMenu } from '@base-ui/react/context-menu'
import { useLayoutEffect, useMemo, useState } from 'react'
import type { FileChange } from '@/src/lib/change-set.ts'
import { type FileTreeRow, FileTreeRows } from '@/src/lib/file-tree-rows.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useReviewStore } from '@/src/store/review-store.ts'
import { useSidebarViewStore } from '@/src/store/sidebar-view-store.ts'
import { useTreeController } from '@/src/hooks/use-tree-controller.ts'

export const useFileTree = (changes: readonly FileChange[]) => {
  'use no memo'
  const selectedPath = useNavigationStore((navigation) => {
    return navigation.selectedPath
  })
  const reviewed = useReviewStore((review) => {
    return review.reviewed
  })
  const toggleReviewed = useReviewStore((review) => {
    return review.toggleReviewed
  })
  const collapsed = useSidebarViewStore((view) => {
    return view.collapsedFolders
  })
  const query = useSidebarViewStore((view) => {
    return view.fileQuery
  })
  const setQuery = useSidebarViewStore((view) => {
    return view.setFileQuery
  })
  const revealFile = useSidebarViewStore((view) => {
    return view.revealFile
  })
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [focusSelection, setFocusSelection] = useState(selectedPath)
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const folderKeys = useMemo(() => {
    return FileTreeRows.folderKeys(changes)
  }, [changes])

  if (selectedPath !== focusSelection) {
    setFocusSelection(selectedPath)
    setFocusKey(null)
  }

  useLayoutEffect(() => {
    revealFile(selectedPath)
  }, [revealFile, selectedPath])

  const rows = useMemo(() => {
    return FileTreeRows.rows(changes, { collapsed, query })
  }, [changes, collapsed, query])
  const activeKey = focusKey ?? selectedPath

  const selectFile = (row: FileTreeRow) => {
    setFocusKey(null)
    const navigation = useNavigationStore.getState()
    if (row.key !== navigation.selectedPath) {
      navigation.selectFile(row.key)
    }
  }

  const tree = useTreeController({
    rows,
    activeKey,
    query,
    collapsed,
    ancestorKeys: (key) => {
      return FileTreeRows.ancestorKeys(key)
    },
    focus: (row) => {
      if (row.type === 'file') {
        selectFile(row)
        return
      }
      setFocusKey(row.key)
    },
    toggle: (row) => {
      useSidebarViewStore.getState().toggleFolder(row.key)
    },
    open: (row, toggle) => {
      if (row.type === 'folder') {
        setFocusKey(row.key)
        toggle(row)
        return
      }
      selectFile(row)
    },
    collapseAll: () => {
      useSidebarViewStore.getState().collapseFolders(folderKeys)
    },
    expandAll: () => {
      useSidebarViewStore.getState().expandFolders()
    },
  })

  const menuRowOf = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return undefined
    }
    const item = target.closest('[role="treeitem"]')
    if (item !== null) {
      return rows.find((row) => {
        return tree.rowId(row.key) === item.id
      })
    }
    if (target.getAttribute('role') === 'tree' && tree.activeIndex >= 0) {
      return rows[tree.activeIndex]
    }
    return undefined
  }

  const onMenuOpenChange = (menuOpen: boolean, details: ContextMenu.Root.ChangeEventDetails) => {
    if (!menuOpen) {
      return
    }
    const row = menuRowOf(details.event.target)
    if (row === undefined || row.type !== 'file') {
      details.cancel()
      return
    }
    setMenuPath(row.key)
  }

  return {
    ...tree,
    rows,
    activeKey,
    selectedPath,
    reviewed,
    query,
    setQuery,
    onMenuOpenChange,
    hasMenuFile: menuPath !== null,
    menuReviewed: menuPath !== null && reviewed.has(menuPath),
    toggleMenuReviewed: () => {
      if (menuPath !== null) {
        toggleReviewed(menuPath)
      }
    },
  }
}

export type FileTreeModel = Omit<ReturnType<typeof useFileTree>, 'attachScrollElement'>
