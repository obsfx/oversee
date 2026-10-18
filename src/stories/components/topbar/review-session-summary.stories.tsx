import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReviewSessionSummary } from '@/src/components/topbar/review-session-summary.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { reviewSessions } from '@/src/stories/support/review-session-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/ReviewSessionSummary',
  component: ReviewSessionSummary,
  args: { session: reviewSessions[0] },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'flex w-96'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof ReviewSessionSummary>

export default meta

type Story = StoryObj<typeof meta>

export const Created: Story = {}

export const InProgress: Story = { args: { session: reviewSessions[1] } }

export const Closed: Story = { args: { session: reviewSessions[2] } }
