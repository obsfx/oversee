import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChangeKindIcon } from '@/src/primitives/change-kind-icon.tsx'

const meta = {
  title: 'Primitives/ChangeKindIcon',
  component: ChangeKindIcon,
  args: { change: 'modified' },
  argTypes: {
    change: {
      control: 'inline-radio',
      options: ['added', 'modified', 'removed'],
    },
  },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ChangeKindIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Modified: Story = {}

export const Added: Story = { args: { change: 'added' } }

export const Removed: Story = { args: { change: 'removed' } }
