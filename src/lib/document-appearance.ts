import { GoogleFontCatalog } from './google-font-catalog.ts'
import { SettingsSchema, type Settings } from './settings-schema.ts'

export abstract class DocumentAppearance {
  static apply(settings: Settings, root: HTMLElement = document.documentElement) {
    GoogleFontCatalog.load(settings.uiFont)
    GoogleFontCatalog.load(settings.editorFont)
    root.classList.toggle('dark', settings.theme === 'dark')
    root.style.fontSize = `${(settings.uiFontSize / SettingsSchema.baseUiFontSize) * 100}%`
    root.style.setProperty('--font-ui', `'${settings.uiFont}', system-ui, sans-serif`)
    root.style.setProperty('--ui-font-weight', String(settings.uiFontWeight))
    root.style.setProperty('--font-editor', `'${settings.editorFont}', ui-monospace, monospace`)
    root.style.setProperty('--editor-font-weight', String(settings.editorFontWeight))
    root.style.setProperty('--editor-font-size', `${settings.editorFontSize}px`)
    root.style.setProperty('--editor-line-height', String(settings.editorLineHeight))
  }
}
