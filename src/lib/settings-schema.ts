import { GoogleFontCatalog } from './google-font-catalog.ts'
import { NumericRange } from './numeric-range.ts'

export type Theme = 'light' | 'dark'

export interface Settings {
  theme: Theme
  uiFont: string
  editorFont: string
  editorFontSize: number
  editorLineHeight: number
}

export abstract class SettingsSchema {
  static readonly themes: Theme[] = ['light', 'dark']
  static readonly fontSizeRange = new NumericRange(8, 32)
  static readonly lineHeightRange = new NumericRange(1, 3)

  static readonly defaults: Settings = {
    theme: 'light',
    uiFont: 'Google Sans Flex',
    editorFont: 'JetBrains Mono',
    editorFontSize: 12,
    editorLineHeight: 1.6,
  }

  static parse(raw: unknown): Settings {
    if (typeof raw !== 'object' || raw === null) {
      return SettingsSchema.defaults
    }
    const value = raw as Partial<Record<keyof Settings, unknown>>
    const { defaults } = SettingsSchema
    return {
      theme:
        SettingsSchema.themes.find((theme) => {
          return theme === value.theme
        }) ?? defaults.theme,
      uiFont: GoogleFontCatalog.isUiFamily(value.uiFont) ? value.uiFont : defaults.uiFont,
      editorFont: GoogleFontCatalog.isEditorFamily(value.editorFont)
        ? value.editorFont
        : defaults.editorFont,
      editorFontSize: SettingsSchema.fontSizeRange.contains(value.editorFontSize)
        ? value.editorFontSize
        : defaults.editorFontSize,
      editorLineHeight: SettingsSchema.lineHeightRange.contains(value.editorLineHeight)
        ? value.editorLineHeight
        : defaults.editorLineHeight,
    }
  }
}
