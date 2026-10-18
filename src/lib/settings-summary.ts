import type { Settings } from './settings-schema.ts'

export abstract class SettingsSummary {
  static interface(settings: Settings) {
    return `${settings.uiFont}, ${settings.uiFontWeight}, ${settings.uiFontSize}px`
  }

  static editor(settings: Settings) {
    return `${settings.editorFont}, ${settings.editorFontWeight}, ${settings.editorFontSize}px, ${settings.editorLineHeight}`
  }
}
