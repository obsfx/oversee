import { Select } from '@base-ui/react/select'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FieldButton } from '@/src/primitives/field-button.tsx'
import { SelectOption } from '@/src/primitives/select-option.tsx'
import { SelectSurface } from '@/src/primitives/select-surface.tsx'

const meta = {
  title: 'Primitives/SelectOption',
  component: SelectOption,
  args: { value: 400, label: '400 Regular' },
  render: (args) => {
    return (
      <Select.Root defaultValue={400} defaultOpen>
        <Select.Trigger render={<FieldButton className={'w-28'} />}>
          <Select.Value />
        </Select.Trigger>
        <SelectSurface>
          <SelectOption {...args} />
          <SelectOption value={700} label={'700 Bold'} style={{ fontWeight: 700 }} />
        </SelectSurface>
      </Select.Root>
    )
  },
} satisfies Meta<typeof SelectOption>

export default meta

export const SelectedAndIdle: StoryObj<typeof meta> = {}
