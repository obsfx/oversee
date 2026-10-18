import type { SettingsViewProps } from '@/src/hooks/use-settings-menu.ts'
import { GoogleFontCatalog } from '@/src/lib/google-font-catalog.ts'
import { SettingsSchema } from '@/src/lib/settings-schema.ts'
import { PanelHeader } from '@/src/primitives/panel-header.tsx'
import { SettingRow } from '@/src/primitives/setting-row.tsx'
import { useSettingsStore } from '@/src/store/settings-store.ts'
import { FontPicker } from '@/src/components/topbar/font-picker.tsx'
import { FontWeightSelect } from '@/src/components/topbar/font-weight-select.tsx'
import { NumericSettingInput } from '@/src/components/topbar/numeric-setting-input.tsx'

export function InterfaceSettings({ navigate }: SettingsViewProps) {
  const settings = useSettingsStore()

  return (
    <>
      <PanelHeader
        title={'Interface'}
        onBack={() => {
          navigate('overview')
        }}
      />
      <SettingRow label={'Font'}>
        <FontPicker
          label={'UI font'}
          value={settings.uiFont}
          families={GoogleFontCatalog.uiFamilies}
          onChange={(uiFont) => {
            settings.update({ uiFont })
          }}
        />
      </SettingRow>
      <SettingRow label={'Weight'}>
        <FontWeightSelect
          label={'UI font weight'}
          family={settings.uiFont}
          value={settings.uiFontWeight}
          onChange={(uiFontWeight) => {
            settings.update({ uiFontWeight })
          }}
        />
      </SettingRow>
      <NumericSettingInput
        label={'Size'}
        unit={'px'}
        range={SettingsSchema.uiFontSizeRange}
        value={settings.uiFontSize}
        onChange={(uiFontSize) => {
          settings.update({ uiFontSize })
        }}
      />
    </>
  )
}
