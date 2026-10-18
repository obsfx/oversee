import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentComposer } from '@/src/components/diff-viewer/comment-composer.tsx'
import { createStoryServices, reviewComments } from '@/src/stories/support/fixtures.ts'
import { StoryAnnotationFrame } from '@/src/stories/support/story-annotation-frame.tsx'
import { resetReviewState, STORY_PATH } from '@/src/stories/support/story-review-state.ts'

const services = createStoryServices()
const [comment] = reviewComments

const meta = {
  title: 'Components/DiffViewer/CommentComposer',
  component: CommentComposer,
  args: {
    path: STORY_PATH,
    range: { start: 12, end: 18, side: 'additions', endSide: 'additions' },
    comment: null,
  },
  beforeEach: () => {
    resetReviewState()
  },
  decorators: [
    (Story) => {
      return (
        <StoryAnnotationFrame services={services}>
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
