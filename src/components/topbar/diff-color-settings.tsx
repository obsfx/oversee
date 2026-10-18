import { useDiffColorSettings } from '@/src/hooks/use-diff-color-settings.ts'
import type { SettingsViewProps } from '@/src/hooks/use-settings-menu.ts'
import { DiffThemeCatalog } from '@/src/lib/diff-theme-catalog.ts'
import { SettingsSchema } from '@/src/lib/settings-schema.ts'
import { OptionGroupLabel } from '@/src/primitives/option-group-label.tsx'
import { OptionList } from '@/src/primitives/option-list.tsx'
import { PanelHeader } from '@/src/primitives/panel-header.tsx'
import { PreviewOptionRow } from '@/src/primitives/preview-option-row.tsx'

export function DiffColorSettings({ navigate }: SettingsViewProps) {
  const { selected, select, preview, clearPreview } = useDiffColorSettings()

  const renderOption = (id: string) => {
    return (
      <PreviewOptionRow
        key={id}
        label={DiffThemeCatalog.label(id)}
        selected={id === selected}
        onSelect={() => {
          select(id)
        }}
        onPreview={() => {
          preview(id)
        }}
      />
    )
  }

  return (
    <>
      <PanelHeader
        title={'Diff colors'}
        onBack={() => {
          navigate('overview')
        }}
      />
      <div className={'-mx-1 -mb-1'} onMouseLeave={clearPreview} onBlur={clearPreview}>
        <OptionList>
          {renderOption(DiffThemeCatalog.auto)}
          {SettingsSchema.themes.map((type) => {
            return (
              <div key={type}>
                <OptionGroupLabel>{type}</OptionGroupLabel>
                {DiffThemeCatalog.ofType(type).map((scheme) => {
                  return renderOption(scheme.id)
                })}
              </div>
            )
          })}
        </OptionList>
      </div>
    </>
  )
}
