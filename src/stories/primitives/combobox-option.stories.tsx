import { Combobox } from '@base-ui/react/combobox'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComboboxOption } from '@/src/primitives/combobox-option.tsx'

const meta = {
  title: 'Primitives/ComboboxOption',
  component: ComboboxOption,
  args: { value: 'JetBrains Mono' },
  render: (args) => {
    return (
      <Combobox.Root items={[args.value, 'Fira Code']} defaultValue={args.value} inline>
        <Combobox.List className={'w-56'}>
          <ComboboxOption {...args} />
          <ComboboxOption value={'Fira Code'} />
        </Combobox.List>
      </Combobox.Root>
    )
  },
} satisfies Meta<typeof ComboboxOption>

export default meta

export const SelectedAndIdle: StoryObj<typeof meta> = {}
