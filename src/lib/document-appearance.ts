import { DiffSurface } from '@/src/lib/diff-surface.ts'
import { GoogleFontCatalog } from '@/src/lib/google-font-catalog.ts'
import { SettingsSchema, type Settings } from '@/src/lib/settings-schema.ts'
import { TreeMetrics } from '@/src/lib/tree-metrics.ts'

export abstract class DocumentAppearance {
  static apply(settings: Settings, root: HTMLElement = document.documentElement) {
    GoogleFontCatalog.load(settings.uiFont)
    GoogleFontCatalog.load(settings.editorFont)
    root.classList.toggle('dark', settings.theme === 'dark')
    const uiScale = SettingsSchema.uiScale(settings.uiFontSize)
    root.style.fontSize = `${uiScale * 100}%`
    root.style.setProperty('--tree-row-height', `${TreeMetrics.rowHeight(uiScale)}px`)
    root.style.setProperty('--font-ui', `'${settings.uiFont}', system-ui, sans-serif`)
    root.style.setProperty('--ui-font-weight', String(settings.uiFontWeight))
    root.style.setProperty('--font-editor', `'${settings.editorFont}', ui-monospace, monospace`)
    root.style.setProperty('--editor-font-weight', String(settings.editorFontWeight))
    root.style.setProperty('--editor-font-size', `${settings.editorFontSize}px`)
    root.style.setProperty(
      '--editor-line-height-px',
      `${DiffSurface.lineHeight(settings.editorFontSize, settings.editorLineHeight)}px`,
    )
  }
}
