import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NotificationRow } from '@/src/primitives/notification-row.tsx'
import { SessionStatusIcon } from '@/src/primitives/session-status-icon.tsx'

const meta = {
  title: 'Primitives/NotificationRow',
  component: NotificationRow,
  args: {
    leading: <SessionStatusIcon status={'in-progress'} />,
    title: 'Review moved to in progress',
    subtitle: 'feat/upgrade-deprecated-versions into main',
    meta: '6m ago',
    unread: true,
    onSelect: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof NotificationRow>

export default meta

type Story = StoryObj<typeof meta>

export const Unread: Story = {}

export const Read: Story = { args: { unread: false } }
