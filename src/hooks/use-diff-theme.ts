import { DiffThemeCatalog } from '@/src/lib/diff-theme-catalog.ts'
import { useDiffViewStore } from '@/src/store/diff-view-store.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

export const useDiffTheme = () => {
  const appTheme = useSettingsStore((state) => {
    return state.theme
  })
  const savedTheme = useSettingsStore((state) => {
    return state.diffTheme
  })
  const previewTheme = useDiffViewStore((state) => {
    return state.previewTheme
  })
  const id = previewTheme ?? savedTheme

  return {
    themes: DiffThemeCatalog.themes(id),
    themeType: DiffThemeCatalog.themeType(id, appTheme),
  }
}
