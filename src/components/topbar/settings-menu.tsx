import { Popover } from '@base-ui/react/popover'
import type { ComponentType } from 'react'
import { VscSettingsGear } from 'react-icons/vsc'
import {
  useSettingsMenu,
  type SettingsView,
  type SettingsViewProps,
} from '../../hooks/use-settings-menu.ts'
import { IconButton } from '../../primitives/icon-button.tsx'
import { PopoverSurface } from '../../primitives/popover-surface.tsx'
import { EditorSettings } from './editor-settings.tsx'
import { InterfaceSettings } from './interface-settings.tsx'
import { SettingsOverview } from './settings-overview.tsx'

const SETTINGS_VIEWS: Record<SettingsView, ComponentType<SettingsViewProps>> = {
  overview: SettingsOverview,
  interface: InterfaceSettings,
  editor: EditorSettings,
}

export function SettingsMenu() {
  const { view, navigate, handleOpenChange } = useSettingsMenu()
  const ActiveView = SETTINGS_VIEWS[view]

  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger render={<IconButton />} title={'Settings'} aria-label={'Settings'}>
        <VscSettingsGear />
      </Popover.Trigger>
      <PopoverSurface align={'end'} className={'flex w-72 flex-col gap-2 p-2'}>
        <ActiveView navigate={navigate} />
      </PopoverSurface>
    </Popover.Root>
  )
}
