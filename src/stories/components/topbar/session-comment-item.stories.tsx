import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SessionCommentItem } from '@/src/components/topbar/session-comment-item.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { reviewSessions } from '@/src/stories/support/review-session-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useCommentsMenuStore } from '@/src/store/comments-menu-store.ts'

const services = createStoryServices()
const replied = reviewSessions[1].comments[0]
const outdatedComment = reviewSessions[0].comments[1]

const meta = {
  title: 'Components/Topbar/SessionCommentItem',
  component: SessionCommentItem,
  args: { comment: replied, onNavigate: fn() },
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
} satisfies Meta<typeof SessionCommentItem>

export default meta

export const Default: StoryObj<typeof meta> = {}

export const Focused: StoryObj<typeof meta> = {
  beforeEach: () => {
    useCommentsMenuStore.setState({ focus: { commentId: replied.id, requestedAt: Date.now() } })
    return () => {
      useCommentsMenuStore.setState({ focus: null })
    }
  },
}

export const Outdated: StoryObj<typeof meta> = { args: { comment: outdatedComment } }
