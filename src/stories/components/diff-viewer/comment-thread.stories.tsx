import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentThread } from '@/src/components/diff-viewer/comment-thread.tsx'
import { createStoryServices, reviewComments } from '@/src/stories/support/fixtures.ts'
import { StoryAnnotationFrame } from '@/src/stories/support/story-annotation-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/DiffViewer/CommentThread',
  component: CommentThread,
  args: { comments: reviewComments.slice(0, 1) },
  decorators: [
    (Story) => {
      return (
        <StoryAnnotationFrame services={services}>
          <Story />
        </StoryAnnotationFrame>
      )
    },
  ],
} satisfies Meta<typeof CommentThread>

export default meta

type Story = StoryObj<typeof meta>

export const Single: Story = {}

export const Several: Story = { args: { comments: reviewComments.slice(0, 2) } }
