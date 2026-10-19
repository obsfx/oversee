import { googleFonts } from 'virtual:google-fonts'

const STYLESHEET_ID_PREFIX = 'google-font-'
const REGULAR_WEIGHT = 400

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
  private static readonly weightsByFamily = new Map(
    googleFonts.map((font) => {
      return [font.family, font.weights]
    }),
  )

  static isUiFamily(family: string) {
    return GoogleFontCatalog.uiFamilySet.has(family)
  }

  static isEditorFamily(family: string) {
    return GoogleFontCatalog.editorFamilySet.has(family)
  }

  static weightsOf(family: string) {
    return GoogleFontCatalog.weightsByFamily.get(family) ?? [REGULAR_WEIGHT]
  }

  static closestWeight(family: string, weight: number) {
    return GoogleFontCatalog.weightsOf(family).reduce((closest, candidate) => {
      return Math.abs(candidate - weight) < Math.abs(closest - weight) ? candidate : closest
    })
  }

  static load(family: string) {
    const id = `${STYLESHEET_ID_PREFIX}${family.replaceAll(' ', '-').toLowerCase()}`
    if (document.getElementById(id)) {
      return
    }
    const weights = GoogleFontCatalog.weightsOf(family).join(';')
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weights}&display=swap`
    document.head.append(link)
  }
}
