import type { SettingsViewProps } from '../../hooks/use-settings-menu.ts'
import { GoogleFontCatalog } from '../../lib/google-font-catalog.ts'
import { SettingsSchema } from '../../lib/settings-schema.ts'
import { PanelHeader } from '../../primitives/panel-header.tsx'
import { SettingRow } from '../../primitives/setting-row.tsx'
import { useSettingsStore } from '../../store/settings-store.ts'
import { FontPicker } from './font-picker.tsx'
import { FontWeightSelect } from './font-weight-select.tsx'
import { NumericSettingInput } from './numeric-setting-input.tsx'

export function EditorSettings({ navigate }: SettingsViewProps) {
  const settings = useSettingsStore()

  return (
    <>
      <PanelHeader
        title={'Editor'}
        onBack={() => {
          navigate('overview')
        }}
      />
      <SettingRow label={'Font'}>
        <FontPicker
          label={'Editor font'}
          value={settings.editorFont}
          families={GoogleFontCatalog.editorFamilies}
          onChange={(editorFont) => {
            settings.update({ editorFont })
          }}
        />
      </SettingRow>
      <SettingRow label={'Weight'}>
        <FontWeightSelect
          label={'Editor font weight'}
          family={settings.editorFont}
          value={settings.editorFontWeight}
          onChange={(editorFontWeight) => {
            settings.update({ editorFontWeight })
          }}
        />
      </SettingRow>
      <NumericSettingInput
        label={'Size'}
        unit={'px'}
        range={SettingsSchema.editorFontSizeRange}
        value={settings.editorFontSize}
        onChange={(editorFontSize) => {
          settings.update({ editorFontSize })
        }}
      />
      <NumericSettingInput
        label={'Line height'}
        range={SettingsSchema.lineHeightRange}
        value={settings.editorLineHeight}
        onChange={(editorLineHeight) => {
          settings.update({ editorLineHeight })
        }}
      />
    </>
  )
}
