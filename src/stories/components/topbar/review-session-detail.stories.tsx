import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ReviewSessionDetail } from '@/src/components/topbar/review-session-detail.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { reviewSessions } from '@/src/stories/support/review-session-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useCommentsMenuStore } from '@/src/store/comments-menu-store.ts'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/ReviewSessionDetail',
  component: ReviewSessionDetail,
  args: {
    session: reviewSessions[1],
    backLabel: 'Back to sessions',
    onBack: fn(),
    onNavigate: fn(),
  },
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

export const WithOutdated: StoryObj<typeof meta> = { args: { session: reviewSessions[0] } }

export const FocusedComment: StoryObj<typeof meta> = {
  beforeEach: () => {
    useCommentsMenuStore.setState({ focus: { commentId: 's2c2', requestedAt: Date.now() } })
    return () => {
      useCommentsMenuStore.setState({ focus: null })
    }
  },
}
