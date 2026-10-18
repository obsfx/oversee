import { useEffect } from 'react'
import { useDiffViewStore } from '@/src/store/diff-view-store.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

export const useDiffColorSettings = () => {
  const selected = useSettingsStore((state) => {
    return state.diffTheme
  })
  const update = useSettingsStore((state) => {
    return state.update
  })
  const setPreviewTheme = useDiffViewStore((state) => {
    return state.setPreviewTheme
  })

  useEffect(() => {
    return () => {
      setPreviewTheme(null)
    }
  }, [setPreviewTheme])

  const select = (diffTheme: string) => {
    setPreviewTheme(null)
    update({ diffTheme })
  }

  const preview = (id: string) => {
    setPreviewTheme(id)
  }

  const clearPreview = () => {
    setPreviewTheme(null)
  }

  return { selected, select, preview, clearPreview }
}
