import { Combobox } from '@base-ui/react/combobox'
import { VscChevronDown } from 'react-icons/vsc'
import { useVirtualizedCombobox } from '@/src/hooks/use-virtualized-combobox.ts'
import { BareInput } from '@/src/primitives/bare-input.tsx'
import { ComboboxSurface } from '@/src/primitives/combobox-surface.tsx'
import { FieldButton } from '@/src/primitives/field-button.tsx'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { SearchField } from '@/src/primitives/search-field.tsx'
import { VirtualizedComboboxList } from '@/src/components/virtualized-combobox-list.tsx'

interface FontPickerProps {
  label: string
  value: string
  families: string[]
  onChange: (family: string) => void
}

export function FontPicker({ label, value, families, onChange }: FontPickerProps) {
  const { open, setOpen, virtualizerRef, handleItemHighlighted } = useVirtualizedCombobox()

  return (
    <Combobox.Root
      virtualized
      items={families}
      value={value}
      open={open}
      onOpenChange={setOpen}
      onItemHighlighted={handleItemHighlighted}
      onValueChange={(next) => {
        if (typeof next === 'string') {
          onChange(next)
        }
      }}
    >
      <Combobox.Trigger
        render={<FieldButton className={'w-36'} />}
        aria-label={label}
        style={{ fontFamily: `'${value}'` }}
      >
        <span className={'truncate'}>
          <Combobox.Value />
        </span>
        <VscChevronDown className={'shrink-0 text-fg-faint'} />
      </Combobox.Trigger>
      <ComboboxSurface label={label}>
        <SearchField>
          <Combobox.Input render={<BareInput />} placeholder={`Search ${families.length} fonts`} />
        </SearchField>
        <Combobox.Empty>
          <MutedHint>No fonts found</MutedHint>
        </Combobox.Empty>
        <Combobox.List className={'pb-1 empty:p-0'}>
          <VirtualizedComboboxList open={open} virtualizerRef={virtualizerRef} />
        </Combobox.List>
      </ComboboxSurface>
    </Combobox.Root>
  )
}
