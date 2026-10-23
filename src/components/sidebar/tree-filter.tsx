import { VscClose } from 'react-icons/vsc'
import { BareInput } from '@/src/primitives/bare-input.tsx'
import { FilterField } from '@/src/primitives/filter-field.tsx'

interface TreeFilterProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function TreeFilter({ label, value, onChange }: TreeFilterProps) {
  return (
    <FilterField>
      <BareInput
        value={value}
        placeholder={label}
        aria-label={label}
        className={'text-xs'}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onChange('')
          }
        }}
      />
      {value !== '' && (
        <button
          type={'button'}
          aria-label={'Clear filter'}
          className={'cursor-pointer text-sidebar-muted hover:text-sidebar-fg'}
          onClick={() => {
            onChange('')
          }}
        >
          <VscClose />
        </button>
      )}
    </FilterField>
  )
}
