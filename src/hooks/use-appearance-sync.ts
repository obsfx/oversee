import { useEffect } from 'react'
import { DocumentAppearance } from '@/src/lib/document-appearance.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

export const useAppearanceSync = () => {
  useEffect(() => {
    DocumentAppearance.apply(useSettingsStore.getState())
    return useSettingsStore.subscribe((settings) => {
      DocumentAppearance.apply(settings)
    })
  }, [])
}
