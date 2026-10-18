import { Select } from '@base-ui/react/select'
import { VscChevronDown } from 'react-icons/vsc'
import { FontWeightNames } from '../../lib/font-weight-names.ts'
import { GoogleFontCatalog } from '../../lib/google-font-catalog.ts'
import { FieldButton } from '../../primitives/field-button.tsx'
import { SelectOption } from '../../primitives/select-option.tsx'
import { SelectSurface } from '../../primitives/select-surface.tsx'

interface FontWeightSelectProps {
  label: string
  family: string
  value: number
  onChange: (weight: number) => void
}

export function FontWeightSelect({ label, family, value, onChange }: FontWeightSelectProps) {
  const weights = GoogleFontCatalog.weightsOf(family)

  return (
    <Select.Root
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'number') {
          onChange(next)
        }
      }}
    >
      <Select.Trigger render={<FieldButton className={'w-36'} />} aria-label={label}>
        <span className={'truncate tabular-nums'}>{FontWeightNames.label(value)}</span>
        <VscChevronDown className={'shrink-0 text-fg-faint'} />
      </Select.Trigger>
      <SelectSurface>
        {weights.map((weight) => {
          return (
            <SelectOption
              key={weight}
              value={weight}
              label={FontWeightNames.label(weight)}
              style={{ fontFamily: `'${family}'`, fontWeight: weight }}
            />
          )
        })}
      </SelectSurface>
    </Select.Root>
  )
}
