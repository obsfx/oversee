import { googleFonts } from 'virtual:google-fonts'

const STYLESHEET_ID_PREFIX = 'google-font-'

export abstract class GoogleFontCatalog {
  static readonly uiFamilies = googleFonts.map((font) => {
    return font.family
  })

  static readonly editorFamilies = googleFonts
    .filter((font) => {
      return font.category === 'monospace'
    })
    .map((font) => {
      return font.family
    })

  private static readonly uiFamilySet = new Set(GoogleFontCatalog.uiFamilies)
  private static readonly editorFamilySet = new Set(GoogleFontCatalog.editorFamilies)

  static isUiFamily(value: unknown): value is string {
    return typeof value === 'string' && GoogleFontCatalog.uiFamilySet.has(value)
  }

  static isEditorFamily(value: unknown): value is string {
    return typeof value === 'string' && GoogleFontCatalog.editorFamilySet.has(value)
  }

  static load(family: string) {
    const id = `${STYLESHEET_ID_PREFIX}${family.replaceAll(' ', '-').toLowerCase()}`
    if (document.getElementById(id)) {
      return
    }
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600&display=swap`
    document.head.append(link)
  }
}
