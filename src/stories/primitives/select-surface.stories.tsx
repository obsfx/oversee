import { Select } from '@base-ui/react/select'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FieldButton } from '@/src/primitives/field-button.tsx'
import { SelectOption } from '@/src/primitives/select-option.tsx'
import { SelectSurface } from '@/src/primitives/select-surface.tsx'

const WEIGHTS = [300, 400, 500, 700]

const meta = {
  title: 'Primitives/SelectSurface',
  component: SelectSurface,
  args: { children: null },
  render: () => {
    return (
      <Select.Root defaultValue={400} defaultOpen>
        <Select.Trigger render={<FieldButton className={'w-28'} />}>
          <Select.Value />
        </Select.Trigger>
        <SelectSurface>
          {WEIGHTS.map((weight) => {
            return <SelectOption key={weight} value={weight} label={String(weight)} />
          })}
        </SelectSurface>
      </Select.Root>
    )
  },
} satisfies Meta<typeof SelectSurface>

export default meta

export const Open: StoryObj<typeof meta> = {}
