import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NotificationList } from '@/src/components/topbar/notification-list.tsx'
import { reviewNotifications } from '@/src/stories/support/notification-fixture.ts'

const meta = {
  title: 'Components/Topbar/NotificationList',
  component: NotificationList,
  args: {
    state: { status: 'ready', data: reviewNotifications },
    notifications: reviewNotifications,
    onOpen: fn(),
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
} satisfies Meta<typeof NotificationList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { state: { status: 'ready', data: [] }, notifications: [] } }

export const Loading: Story = { args: { state: { status: 'loading' }, notifications: [] } }
