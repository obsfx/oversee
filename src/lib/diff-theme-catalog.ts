import type { ThemesType, ThemeTypes } from '@pierre/diffs/react'
import type { Theme } from '@/src/lib/settings-schema.ts'

export interface DiffScheme {
  id: string
  label: string
  type: Theme
}

export abstract class DiffThemeCatalog {
  static readonly auto = 'auto'
  static readonly autoLabel = 'Pierre (match theme)'
  static readonly autoThemes: ThemesType = { light: 'pierre-light', dark: 'pierre-dark' }

  static readonly schemes: DiffScheme[] = [
    { id: 'pierre-light', label: 'Pierre Light', type: 'light' },
    { id: 'pierre-light-soft', label: 'Pierre Light Soft', type: 'light' },
    { id: 'pierre-light-vibrant', label: 'Pierre Light Vibrant', type: 'light' },
    { id: 'github-light', label: 'GitHub Light', type: 'light' },
    { id: 'github-light-default', label: 'GitHub Light Default', type: 'light' },
    { id: 'github-light-high-contrast', label: 'GitHub Light High Contrast', type: 'light' },
    { id: 'light-plus', label: 'VS Code Light+', type: 'light' },
    { id: 'one-light', label: 'One Light', type: 'light' },
    { id: 'catppuccin-latte', label: 'Catppuccin Latte', type: 'light' },
    { id: 'solarized-light', label: 'Solarized Light', type: 'light' },
    { id: 'vitesse-light', label: 'Vitesse Light', type: 'light' },
    { id: 'min-light', label: 'Min Light', type: 'light' },
    { id: 'rose-pine-dawn', label: 'Rose Pine Dawn', type: 'light' },
    { id: 'everforest-light', label: 'Everforest Light', type: 'light' },
    { id: 'gruvbox-light-medium', label: 'Gruvbox Light', type: 'light' },
    { id: 'kanagawa-lotus', label: 'Kanagawa Lotus', type: 'light' },
    { id: 'ayu-light', label: 'Ayu Light', type: 'light' },
    { id: 'night-owl-light', label: 'Night Owl Light', type: 'light' },
    { id: 'material-theme-lighter', label: 'Material Lighter', type: 'light' },
    { id: 'snazzy-light', label: 'Snazzy Light', type: 'light' },
    { id: 'pierre-dark', label: 'Pierre Dark', type: 'dark' },
    { id: 'pierre-dark-soft', label: 'Pierre Dark Soft', type: 'dark' },
    { id: 'pierre-dark-vibrant', label: 'Pierre Dark Vibrant', type: 'dark' },
    { id: 'github-dark', label: 'GitHub Dark', type: 'dark' },
    { id: 'github-dark-default', label: 'GitHub Dark Default', type: 'dark' },
    { id: 'github-dark-dimmed', label: 'GitHub Dark Dimmed', type: 'dark' },
    { id: 'github-dark-high-contrast', label: 'GitHub Dark High Contrast', type: 'dark' },
    { id: 'dark-plus', label: 'VS Code Dark+', type: 'dark' },
    { id: 'one-dark-pro', label: 'One Dark Pro', type: 'dark' },
    { id: 'catppuccin-frappe', label: 'Catppuccin Frappe', type: 'dark' },
    { id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', type: 'dark' },
    { id: 'catppuccin-mocha', label: 'Catppuccin Mocha', type: 'dark' },
    { id: 'solarized-dark', label: 'Solarized Dark', type: 'dark' },
    { id: 'vitesse-dark', label: 'Vitesse Dark', type: 'dark' },
    { id: 'min-dark', label: 'Min Dark', type: 'dark' },
    { id: 'rose-pine', label: 'Rose Pine', type: 'dark' },
    { id: 'rose-pine-moon', label: 'Rose Pine Moon', type: 'dark' },
    { id: 'everforest-dark', label: 'Everforest Dark', type: 'dark' },
    { id: 'gruvbox-dark-medium', label: 'Gruvbox Dark', type: 'dark' },
    { id: 'kanagawa-wave', label: 'Kanagawa Wave', type: 'dark' },
    { id: 'ayu-dark', label: 'Ayu Dark', type: 'dark' },
    { id: 'night-owl', label: 'Night Owl', type: 'dark' },
    { id: 'material-theme', label: 'Material', type: 'dark' },
    { id: 'tokyo-night', label: 'Tokyo Night', type: 'dark' },
    { id: 'dracula', label: 'Dracula', type: 'dark' },
    { id: 'nord', label: 'Nord', type: 'dark' },
    { id: 'monokai', label: 'Monokai', type: 'dark' },
    { id: 'poimandres', label: 'Poimandres', type: 'dark' },
    { id: 'vesper', label: 'Vesper', type: 'dark' },
    { id: 'houston', label: 'Houston', type: 'dark' },
    { id: 'synthwave-84', label: 'Synthwave 84', type: 'dark' },
  ]

  private static readonly schemesById = new Map(
    DiffThemeCatalog.schemes.map((scheme) => {
      return [scheme.id, scheme]
    }),
  )

  static isDiffTheme(id: string) {
    return id === DiffThemeCatalog.auto || DiffThemeCatalog.schemesById.has(id)
  }

  static ofType(type: Theme) {
    return DiffThemeCatalog.schemes.filter((scheme) => {
      return scheme.type === type
    })
  }

  static label(id: string) {
    return DiffThemeCatalog.schemesById.get(id)?.label ?? DiffThemeCatalog.autoLabel
  }

  static themes(id: string): ThemesType {
    if (DiffThemeCatalog.schemesById.has(id)) {
      return { light: id, dark: id }
    }
    return DiffThemeCatalog.autoThemes
  }

  static resolvedName(themes: ThemesType, themeType: ThemeTypes) {
    return themeType === 'dark' ? themes.dark : themes.light
  }

  static themeType(id: string, appTheme: Theme): ThemeTypes {
    return DiffThemeCatalog.schemesById.get(id)?.type ?? appTheme
  }
}
