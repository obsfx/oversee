import { DiffThemeCatalog } from '@/src/lib/diff-theme-catalog.ts'
import type { Settings } from '@/src/lib/settings-schema.ts'

export abstract class SettingsSummary {
  static interface(settings: Settings) {
    return `${settings.uiFont}, ${settings.uiFontWeight}, ${settings.uiFontSize}px`
  }

  static editor(settings: Settings) {
    return `${settings.editorFont}, ${settings.editorFontWeight}, ${settings.editorFontSize}px, ${settings.editorLineHeight}`
  }

  static diffColors(settings: Settings) {
    return DiffThemeCatalog.label(settings.diffTheme)
  }
}
