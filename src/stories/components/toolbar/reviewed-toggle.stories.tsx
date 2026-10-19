import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ReviewedToggle } from '@/src/components/toolbar/reviewed-toggle.tsx'
import { seedReviewedMarks, STORY_PATH } from '@/src/stories/support/story-review-state.ts'

const meta = {
  title: 'Components/Toolbar/ReviewedToggle',
  component: ReviewedToggle,
  args: { path: STORY_PATH, onMarked: fn() },
  beforeEach: () => {
    seedReviewedMarks()
  },
} satisfies Meta<typeof ReviewedToggle>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Reviewed: Story = {
  beforeEach: () => {
    seedReviewedMarks([STORY_PATH])
  },
}
