import * as v from 'valibot'

const MODES = ['files', 'flow'] as const

export type SidebarMode = (typeof MODES)[number]

const LABELS: Record<SidebarMode, string> = {
  files: 'Files',
  flow: 'Flow',
}

const TITLES: Record<SidebarMode, string> = {
  files: 'Changed files',
  flow: 'Call flow',
}

const DETAILS: Record<SidebarMode, string> = {
  files: 'The changed files as a tree',
  flow: 'The changed functions in call order',
}

export abstract class SidebarModes {
  static readonly all: readonly SidebarMode[] = MODES

  static readonly fallback: SidebarMode = 'files'

  private static readonly schema = v.fallback(v.picklist(MODES), SidebarModes.fallback)

  private static readonly menuLabel = 'Sidebar view'

  static label(mode: SidebarMode) {
    return LABELS[mode]
  }

  static menuTriggerLabel(mode: SidebarMode) {
    return `${SidebarModes.menuLabel}: ${LABELS[mode]}`
  }

  static title(mode: SidebarMode) {
    return TITLES[mode]
  }

  static detail(mode: SidebarMode) {
    return DETAILS[mode]
  }

  static parse(value: unknown): SidebarMode {
    return v.parse(SidebarModes.schema, value)
  }
}
