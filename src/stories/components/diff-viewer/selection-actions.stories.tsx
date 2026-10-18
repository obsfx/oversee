import type { Meta, StoryObj } from '@storybook/react-vite'
import { SelectionActions } from '@/src/components/diff-viewer/selection-actions.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryAnnotationFrame } from '@/src/stories/support/story-annotation-frame.tsx'
import { STORY_PATH } from '@/src/stories/support/story-review-state.ts'

const services = createStoryServices()

const meta = {
  title: 'Components/DiffViewer/SelectionActions',
  component: SelectionActions,
  args: {
    path: STORY_PATH,
    range: { start: 12, end: 18, side: 'additions', endSide: 'additions' },
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
} satisfies Meta<typeof SelectionActions>

export default meta

type Story = StoryObj<typeof meta>

export const MultipleLines: Story = {}

export const SingleLine: Story = {
  args: { range: { start: 24, end: 24, side: 'additions', endSide: 'additions' } },
}
