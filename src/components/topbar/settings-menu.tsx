import { Popover } from '@base-ui/react/popover'
import type { ComponentType } from 'react'
import { VscSettingsGear } from 'react-icons/vsc'
import { c } from '@/src/c.ts'
import {
  useSettingsMenu,
  type SettingsView,
  type SettingsViewProps,
} from '@/src/hooks/use-settings-menu.ts'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'
import { Tooltip } from '@/src/primitives/tooltip.tsx'
import { DiffColorSettings } from '@/src/components/topbar/diff-color-settings.tsx'
import { EditorSettings } from '@/src/components/topbar/editor-settings.tsx'
import { InterfaceSettings } from '@/src/components/topbar/interface-settings.tsx'
import { LanguageServerSettings } from '@/src/components/topbar/language-server-settings.tsx'
import { SettingsOverview } from '@/src/components/topbar/settings-overview.tsx'

const SETTINGS_VIEWS: Record<SettingsView, ComponentType<SettingsViewProps>> = {
  overview: SettingsOverview,
  interface: InterfaceSettings,
  editor: EditorSettings,
  diffColors: DiffColorSettings,
  languageServers: LanguageServerSettings,
}

export function SettingsMenu() {
  const { view, navigate, handleOpenChange, wide } = useSettingsMenu()
  const ActiveView = SETTINGS_VIEWS[view]

  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Tooltip label={'Settings'}>
        <Popover.Trigger render={<IconButton />} aria-label={'Settings'}>
          <VscSettingsGear />
        </Popover.Trigger>
      </Tooltip>
      <PopoverSurface
        align={'end'}
        className={c('flex flex-col gap-2 p-2', wide ? 'w-80' : 'w-72')}
      >
        <ActiveView navigate={navigate} />
      </PopoverSurface>
    </Popover.Root>
  )
}
