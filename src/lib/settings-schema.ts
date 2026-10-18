import { GoogleFontCatalog } from './google-font-catalog.ts'
import { NumericRange } from './numeric-range.ts'

export type Theme = 'light' | 'dark'

export interface Settings {
  theme: Theme
  uiFont: string
  uiFontWeight: number
  uiFontSize: number
  editorFont: string
  editorFontWeight: number
  editorFontSize: number
  editorLineHeight: number
}

export abstract class SettingsSchema {
  static readonly themes: Theme[] = ['light', 'dark']
  static readonly uiFontSizeRange = new NumericRange(10, 18)
  static readonly editorFontSizeRange = new NumericRange(8, 32)
  static readonly lineHeightRange = new NumericRange(1, 3)
  static readonly baseUiFontSize = 12

  static readonly defaults: Settings = {
    theme: 'light',
    uiFont: 'Google Sans Flex',
    uiFontWeight: 400,
    uiFontSize: 12,
    editorFont: 'JetBrains Mono',
    editorFontWeight: 400,
    editorFontSize: 12,
    editorLineHeight: 1.6,
  }

  static parse(raw: unknown): Settings {
    if (typeof raw !== 'object' || raw === null) {
      return SettingsSchema.defaults
    }
    const value = raw as Partial<Record<keyof Settings, unknown>>
    const { defaults } = SettingsSchema
    const uiFont = GoogleFontCatalog.isUiFamily(value.uiFont) ? value.uiFont : defaults.uiFont
    const editorFont = GoogleFontCatalog.isEditorFamily(value.editorFont)
      ? value.editorFont
      : defaults.editorFont
    return {
      theme:
        SettingsSchema.themes.find((theme) => {
          return theme === value.theme
        }) ?? defaults.theme,
      uiFont,
      uiFontWeight: GoogleFontCatalog.closestWeight(uiFont, value.uiFontWeight),
      uiFontSize: SettingsSchema.uiFontSizeRange.contains(value.uiFontSize)
        ? value.uiFontSize
        : defaults.uiFontSize,
      editorFont,
      editorFontWeight: GoogleFontCatalog.closestWeight(editorFont, value.editorFontWeight),
      editorFontSize: SettingsSchema.editorFontSizeRange.contains(value.editorFontSize)
        ? value.editorFontSize
        : defaults.editorFontSize,
      editorLineHeight: SettingsSchema.lineHeightRange.contains(value.editorLineHeight)
        ? value.editorLineHeight
        : defaults.editorLineHeight,
    }
  }
}
