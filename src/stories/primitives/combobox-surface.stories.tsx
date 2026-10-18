import { Combobox } from '@base-ui/react/combobox'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BareInput } from '../../primitives/bare-input.tsx'
import { ComboboxOption } from '../../primitives/combobox-option.tsx'
import { ComboboxSurface } from '../../primitives/combobox-surface.tsx'
import { FieldButton } from '../../primitives/field-button.tsx'
import { SearchField } from '../../primitives/search-field.tsx'

const fonts = ['Fira Code', 'IBM Plex Mono', 'JetBrains Mono', 'Source Code Pro']

const meta = {
  title: 'Primitives/ComboboxSurface',
  component: ComboboxSurface,
  args: { label: 'Editor font', children: null },
  render: (args) => {
    return (
      <div className={'flex justify-end'}>
        <Combobox.Root items={fonts} defaultValue={'JetBrains Mono'} defaultOpen>
          <Combobox.Trigger render={<FieldButton />} aria-label={args.label}>
            <Combobox.Value />
          </Combobox.Trigger>
          <ComboboxSurface label={args.label}>
            <SearchField>
              <Combobox.Input render={<BareInput />} placeholder={'Search fonts'} />
            </SearchField>
            <Combobox.List className={'px-1 pb-1'}>
              {(font: string) => {
                return <ComboboxOption key={font} value={font} />
              }}
            </Combobox.List>
          </ComboboxSurface>
        </Combobox.Root>
      </div>
    )
  },
} satisfies Meta<typeof ComboboxSurface>

export default meta

export const Open: StoryObj<typeof meta> = {}
