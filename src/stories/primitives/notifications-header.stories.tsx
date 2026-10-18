import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotificationsHeader } from '@/src/primitives/notifications-header.tsx'
import { TextButton } from '@/src/primitives/text-button.tsx'

const meta = {
  title: 'Primitives/NotificationsHeader',
  component: NotificationsHeader,
  args: { meta: '2 unread', action: <TextButton>Mark all read</TextButton> },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof NotificationsHeader>

export default meta

type Story = StoryObj<typeof meta>

export const WithUnread: Story = {}

export const AllRead: Story = { args: { meta: 'All caught up', action: undefined } }
