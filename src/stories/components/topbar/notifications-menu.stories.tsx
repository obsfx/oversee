import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotificationsMenu } from '@/src/components/topbar/notifications-menu.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/NotificationsMenu',
  component: NotificationsMenu,
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'flex justify-end'}>
          <NotificationsMenu />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const WithUnread: Story = {}

export const Empty: Story = { args: { services: createStoryServices({ notifications: [] }) } }
