import { useNumericDraft } from '@/src/hooks/use-numeric-draft.ts'
import type { NumericRange } from '@/src/lib/numeric-range.ts'
import { BareInput } from '@/src/primitives/bare-input.tsx'
import { InputFrame } from '@/src/primitives/input-frame.tsx'
import { SettingRow } from '@/src/primitives/setting-row.tsx'

interface NumericSettingInputProps {
  label: string
  value: number
  range: NumericRange
  unit?: string
  onChange: (value: number) => void
}

export function NumericSettingInput({
  label,
  value,
  range,
  unit,
  onChange,
}: NumericSettingInputProps) {
  const { draft, isValid, change, revertIfInvalid } = useNumericDraft(value, range, onChange)
  const error = isValid ? null : `Enter a value between ${range.min} and ${range.max}`

  return (
    <SettingRow label={label} error={error}>
      <InputFrame invalid={!isValid} suffix={unit} className={'w-36'}>
        <BareInput
          value={draft}
          inputMode={'decimal'}
          aria-label={label}
          aria-invalid={!isValid}
          className={'tabular-nums'}
          onChange={(event) => {
            change(event.target.value)
          }}
          onBlur={revertIfInvalid}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
        />
      </InputFrame>
    </SettingRow>
  )
}
