import type { SettingsViewProps } from '../../hooks/use-settings-menu.ts'
import { SettingsSummary } from '../../lib/settings-summary.ts'
import { SettingRow } from '../../primitives/setting-row.tsx'
import { SummaryRow } from '../../primitives/summary-row.tsx'
import { useSettingsStore } from '../../store/settings-store.ts'
import { ThemeToggle } from './theme-toggle.tsx'

export function SettingsOverview({ navigate }: SettingsViewProps) {
  const settings = useSettingsStore()

  return (
    <>
      <SettingRow label={'Theme'}>
        <ThemeToggle
          value={settings.theme}
          onChange={(theme) => {
            settings.update({ theme })
          }}
        />
      </SettingRow>
      <div className={'-mx-1 flex flex-col'}>
        <SummaryRow
          label={'Interface'}
          summary={SettingsSummary.interface(settings)}
          onOpen={() => {
            navigate('interface')
          }}
        />
        <SummaryRow
          label={'Editor'}
          summary={SettingsSummary.editor(settings)}
          onOpen={() => {
            navigate('editor')
          }}
        />
      </div>
    </>
  )
}
