import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { useSettingsStore } from '@/src/store/settings-store.ts'

export const useEditorMetrics = () => {
  const editorFontSize = useSettingsStore((settings) => {
    return settings.editorFontSize
  })
  const editorLineHeight = useSettingsStore((settings) => {
    return settings.editorLineHeight
  })
  return DiffSurface.metrics(editorFontSize, editorLineHeight)
}
