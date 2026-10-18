import { Popover } from '@base-ui/react/popover'
import type { ComponentType } from 'react'
import { VscSettingsGear } from 'react-icons/vsc'
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
import { SettingsOverview } from '@/src/components/topbar/settings-overview.tsx'

const SETTINGS_VIEWS: Record<SettingsView, ComponentType<SettingsViewProps>> = {
  overview: SettingsOverview,
  interface: InterfaceSettings,
  editor: EditorSettings,
  diffColors: DiffColorSettings,
}

export function SettingsMenu() {
  const { view, navigate, handleOpenChange } = useSettingsMenu()
  const ActiveView = SETTINGS_VIEWS[view]

  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Tooltip label={'Settings'}>
        <Popover.Trigger render={<IconButton />} aria-label={'Settings'}>
          <VscSettingsGear />
        </Popover.Trigger>
      </Tooltip>
      <PopoverSurface align={'end'} className={'flex w-72 flex-col gap-2 p-2'}>
        <ActiveView navigate={navigate} />
      </PopoverSurface>
    </Popover.Root>
  )
}
