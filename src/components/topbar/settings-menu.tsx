import { Popover } from '@base-ui/react/popover'
import { VscSettingsGear } from 'react-icons/vsc'
import { GoogleFontCatalog } from '../../lib/google-font-catalog.ts'
import { SettingsSchema } from '../../lib/settings-schema.ts'
import { IconButton } from '../../primitives/icon-button.tsx'
import { PopoverSurface } from '../../primitives/popover-surface.tsx'
import { SettingRow } from '../../primitives/setting-row.tsx'
import { useSettingsStore } from '../../store/settings-store.ts'
import { FontPicker } from './font-picker.tsx'
import { NumericSettingInput } from './numeric-setting-input.tsx'
import { ThemeToggle } from './theme-toggle.tsx'

export function SettingsMenu() {
  const settings = useSettingsStore()
  const { update } = settings

  return (
    <Popover.Root>
      <Popover.Trigger render={<IconButton />} title={'Settings'} aria-label={'Settings'}>
        <VscSettingsGear />
      </Popover.Trigger>
      <PopoverSurface align={'end'} className={'flex w-64 flex-col gap-2 p-2'}>
        <SettingRow label={'Theme'}>
          <ThemeToggle
            value={settings.theme}
            onChange={(theme) => {
              return update({ theme })
            }}
          />
        </SettingRow>
        <SettingRow label={'UI font'}>
          <FontPicker
            label={'UI font'}
            value={settings.uiFont}
            families={GoogleFontCatalog.uiFamilies}
            onChange={(uiFont) => {
              return update({ uiFont })
            }}
          />
        </SettingRow>
        <SettingRow label={'Editor font'}>
          <FontPicker
            label={'Editor font'}
            value={settings.editorFont}
            families={GoogleFontCatalog.editorFamilies}
            onChange={(editorFont) => {
              return update({ editorFont })
            }}
          />
        </SettingRow>
        <NumericSettingInput
          label={'Font size'}
          unit={'px'}
          range={SettingsSchema.fontSizeRange}
          value={settings.editorFontSize}
          onChange={(editorFontSize) => {
            return update({ editorFontSize })
          }}
        />
        <NumericSettingInput
          label={'Line height'}
          range={SettingsSchema.lineHeightRange}
          value={settings.editorLineHeight}
          onChange={(editorLineHeight) => {
            return update({ editorLineHeight })
          }}
        />
      </PopoverSurface>
    </Popover.Root>
  )
}
