import type { Theme } from '@/src/lib/settings-schema.ts'
import { SettingsSchema } from '@/src/lib/settings-schema.ts'
import { SegmentedControl } from '@/src/primitives/segmented-control.tsx'
import { SegmentedOption } from '@/src/primitives/segmented-option.tsx'

interface ThemeToggleProps {
  value: Theme
  onChange: (theme: Theme) => void
}

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <SegmentedControl>
      {SettingsSchema.themes.map((theme) => {
        return (
          <SegmentedOption
            key={theme}
            active={theme === value}
            onClick={() => {
              return onChange(theme)
            }}
          >
            {theme}
          </SegmentedOption>
        )
      })}
    </SegmentedControl>
  )
}
