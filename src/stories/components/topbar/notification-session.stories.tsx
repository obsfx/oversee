import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NotificationSession } from '@/src/components/topbar/notification-session.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/NotificationSession',
  component: NotificationSession,
  args: { sessionId: 's2', onBack: fn() },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'w-[26rem] rounded-md border border-line bg-popup'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof NotificationSession>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Missing: Story = { args: { sessionId: 'unknown' } }
