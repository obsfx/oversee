import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotificationIcon } from '@/src/components/topbar/notification-icon.tsx'
import { reviewNotifications } from '@/src/stories/support/notification-fixture.ts'

const meta = {
  title: 'Components/Topbar/NotificationIcon',
  component: NotificationIcon,
  args: { notification: reviewNotifications[0]! },
} satisfies Meta<typeof NotificationIcon>

export default meta

type Story = StoryObj<typeof meta>

export const SessionStatus: Story = {}

export const CommentReply: Story = { args: { notification: reviewNotifications[1]! } }
