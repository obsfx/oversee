import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentItem } from '@/src/components/diff-viewer/comment-item.tsx'
import { createStoryServices, reviewComments } from '@/src/stories/support/fixtures.ts'
import { StoryAnnotationFrame } from '@/src/stories/support/story-annotation-frame.tsx'

const services = createStoryServices()
const [first, second] = reviewComments

const meta = {
  title: 'Components/DiffViewer/CommentItem',
  component: CommentItem,
  args: { comment: first },
  decorators: [
    (Story) => {
      return (
        <StoryAnnotationFrame services={services}>
          <Story />
        </StoryAnnotationFrame>
      )
    },
  ],
} satisfies Meta<typeof CommentItem>

export default meta

type Story = StoryObj<typeof meta>

export const SingleLine: Story = {}

export const MultiLine: Story = { args: { comment: second } }

export const Edited: Story = {
  args: { comment: { ...first, updatedAt: first.createdAt + 60 * 1000 } },
}
