import type { Meta, StoryObj } from '@storybook/react-vite'
import { ViaLabel } from '@/src/primitives/via-label.tsx'

const meta = {
  title: 'Primitives/ViaLabel',
  component: ViaLabel,
  args: { via: 'signal', text: 'stamina_changed', title: 'Runs when stamina_changed is emitted' },
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-72 bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ViaLabel>

export default meta

type Story = StoryObj<typeof meta>

export const Signal: Story = {}

export const Connect: Story = {
  args: { via: 'connect', title: 'Connects stamina_changed to this handler' },
}

export const Implementation: Story = {
  args: {
    via: 'implementation',
    text: 'SessionPool',
    title: 'Implements the interface method called here',
  },
}

export const LongName: Story = {
  args: { text: 'player_inventory_item_quantity_changed_after_server_sync' },
}
