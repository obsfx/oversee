import * as v from 'valibot'
import { DiffThemeCatalog } from '@/src/lib/diff-theme-catalog.ts'
import { GoogleFontCatalog } from '@/src/lib/google-font-catalog.ts'
import { NumericRange } from '@/src/lib/numeric-range.ts'

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
  diffTheme: string
  dismissedLanguageServers: string[]
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
    diffTheme: DiffThemeCatalog.auto,
    dismissedLanguageServers: [],
  }

  static uiScale(uiFontSize: number) {
    return uiFontSize / SettingsSchema.baseUiFontSize
  }

  static readonly schema = v.pipe(
    v.fallback(
      v.object({
        theme: v.fallback(v.picklist(SettingsSchema.themes), SettingsSchema.defaults.theme),
        uiFont: v.fallback(
          v.pipe(v.string(), v.check(GoogleFontCatalog.isUiFamily)),
          SettingsSchema.defaults.uiFont,
        ),
        uiFontWeight: v.fallback(v.number(), SettingsSchema.defaults.uiFontWeight),
        uiFontSize: SettingsSchema.uiFontSizeRange.schemaOr(SettingsSchema.defaults.uiFontSize),
        editorFont: v.fallback(
          v.pipe(v.string(), v.check(GoogleFontCatalog.isEditorFamily)),
          SettingsSchema.defaults.editorFont,
        ),
        editorFontWeight: v.fallback(v.number(), SettingsSchema.defaults.editorFontWeight),
        editorFontSize: SettingsSchema.editorFontSizeRange.schemaOr(
          SettingsSchema.defaults.editorFontSize,
        ),
        editorLineHeight: SettingsSchema.lineHeightRange.schemaOr(
          SettingsSchema.defaults.editorLineHeight,
        ),
        diffTheme: v.fallback(
          v.pipe(v.string(), v.check(DiffThemeCatalog.isDiffTheme)),
          SettingsSchema.defaults.diffTheme,
        ),
        dismissedLanguageServers: v.fallback(
          v.array(v.string()),
          SettingsSchema.defaults.dismissedLanguageServers,
        ),
      }),
      SettingsSchema.defaults,
    ),
    v.transform((stored): Settings => {
      return {
        ...stored,
        uiFontWeight: GoogleFontCatalog.closestWeight(stored.uiFont, stored.uiFontWeight),
        editorFontWeight: GoogleFontCatalog.closestWeight(
          stored.editorFont,
          stored.editorFontWeight,
        ),
      }
    }),
  )

  static parse(raw: unknown): Settings {
    return v.parse(SettingsSchema.schema, raw)
  }
}
