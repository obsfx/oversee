import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OutdatedNotice } from '@/src/primitives/outdated-notice.tsx'

const meta = {
  title: 'Primitives/OutdatedNotice',
  component: OutdatedNotice,
  args: {
    title: '2 outdated comments',
    description: 'The code changed after you commented',
    onSelect: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 p-1 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof OutdatedNotice>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Single: Story = { args: { title: '1 outdated comment' } }
