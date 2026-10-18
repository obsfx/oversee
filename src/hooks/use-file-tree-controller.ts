import { useFileTree } from '@pierre/trees/react'
import { useEffect, useState } from 'react'
import type { FileChange } from '../lib/change-set.ts'
import { FileTreeController, type FileTreeHandlers } from '../lib/file-tree-controller.ts'
import { useNavigationStore } from '../store/navigation-store.ts'
import { useReviewStore } from '../store/review-store.ts'

const handlers: FileTreeHandlers = {
  isReviewed: (path) => {
    return useReviewStore.getState().reviewed.has(path)
  },
  onSelectFile: (path) => {
    const navigation = useNavigationStore.getState()
    if (path !== navigation.selectedPath) {
      navigation.selectFile(path)
    }
  },
}

export const useFileTreeController = (paths: readonly string[], changes: readonly FileChange[]) => {
  const { model } = useFileTree(FileTreeController.createOptions({ paths, changes }, handlers))
  const [controller] = useState(() => {
    return new FileTreeController(model, { paths, changes })
  })

  useEffect(() => {
    controller.syncPaths(paths)
    controller.reveal(useNavigationStore.getState().selectedPath)
  }, [controller, paths])

  useEffect(() => {
    controller.syncChanges(changes)
  }, [controller, changes])

  useEffect(() => {
    return useReviewStore.subscribe((state, previous) => {
      if (state.reviewed !== previous.reviewed) {
        controller.refreshDecorations()
      }
    })
  }, [controller])

  useEffect(() => {
    return useNavigationStore.subscribe((state) => {
      controller.reveal(state.selectedPath)
    })
  }, [controller])

  return controller
}
