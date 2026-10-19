import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentComposer } from '@/src/components/diff-viewer/comment-composer.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices, reviewComments } from '@/src/stories/support/fixtures.ts'
import { StaleCommentGateway } from '@/src/stories/support/stale-comment-gateway.ts'
import { StoryAnnotationFrame } from '@/src/stories/support/story-annotation-frame.tsx'
import { resetReviewState, STORY_PATH } from '@/src/stories/support/story-review-state.ts'

const services = createStoryServices()
const staleServices = createStoryServices({
  commentGateway: new StaleCommentGateway(reviewComments),
})
const [comment] = reviewComments

const meta = {
  title: 'Components/DiffViewer/CommentComposer',
  component: CommentComposer,
  args: {
    path: STORY_PATH,
    range: { start: 12, end: 18, side: 'additions', endSide: 'additions' },
    comment: null,
  },
  parameters: { services },
  beforeEach: () => {
    resetReviewState()
  },
  decorators: [
    (Story, context) => {
      const storyServices = context.parameters.services as Services
      return (
        <StoryAnnotationFrame services={storyServices}>
          <Story />
        </StoryAnnotationFrame>
      )
    },
  ],
} satisfies Meta<typeof CommentComposer>

export default meta

type Story = StoryObj<typeof meta>

export const NewComment: Story = {}

export const EditComment: Story = { args: { range: comment.range, comment } }

export const StaleContent: Story = { parameters: { services: staleServices } }
