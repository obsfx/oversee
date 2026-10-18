import { useFileTree } from '@pierre/trees/react'
import { useEffect, useState } from 'react'
import type { FileChange } from '@/src/lib/change-set.ts'
import { FileTreeController, type FileTreeHandlers } from '@/src/lib/file-tree-controller.ts'
import { SettingsSchema } from '@/src/lib/settings-schema.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useReviewStore } from '@/src/store/review-store.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

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
  const uiFontSize = useSettingsStore((settings) => {
    return settings.uiFontSize
  })
  const { model } = useFileTree(
    FileTreeController.createOptions(
      { paths, changes },
      handlers,
      SettingsSchema.uiScale(uiFontSize),
    ),
  )
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
