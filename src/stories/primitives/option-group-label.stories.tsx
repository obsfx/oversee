import type { Meta, StoryObj } from '@storybook/react-vite'
import { OptionGroupLabel } from '@/src/primitives/option-group-label.tsx'

const meta = {
  title: 'Primitives/OptionGroupLabel',
  component: OptionGroupLabel,
  args: { children: 'dark' },
  decorators: [
    (Story) => {
      return (
        <div className={'w-72 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof OptionGroupLabel>

export default meta

export const Default: StoryObj<typeof meta> = {}
