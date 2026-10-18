import type { SettingsViewProps } from '@/src/hooks/use-settings-menu.ts'
import { SettingsSummary } from '@/src/lib/settings-summary.ts'
import { SettingRow } from '@/src/primitives/setting-row.tsx'
import { SummaryRow } from '@/src/primitives/summary-row.tsx'
import { useSettingsStore } from '@/src/store/settings-store.ts'
import { ThemeToggle } from '@/src/components/topbar/theme-toggle.tsx'

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
