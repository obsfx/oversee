import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ReviewSessionDetail } from '@/src/components/topbar/review-session-detail.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { reviewSessions } from '@/src/stories/support/review-session-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/ReviewSessionDetail',
  component: ReviewSessionDetail,
  args: { session: reviewSessions[1], onBack: fn() },
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
} satisfies Meta<typeof ReviewSessionDetail>

export default meta

export const Default: StoryObj<typeof meta> = {}
