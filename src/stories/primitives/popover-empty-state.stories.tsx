import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscComment } from 'react-icons/vsc'
import { PopoverEmptyState } from '@/src/primitives/popover-empty-state.tsx'

const meta = {
  title: 'Primitives/PopoverEmptyState',
  component: PopoverEmptyState,
  args: {
    icon: <VscComment />,
    children: 'No active review. Comment on a line to start one.',
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-[26rem] rounded-md border border-line bg-popup text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof PopoverEmptyState>

export default meta

export const Default: StoryObj<typeof meta> = {}
