import type { Meta, StoryObj } from '@storybook/react-vite'
import { UnmarkAllButton } from '@/src/components/sidebar/unmark-all-button.tsx'
import { changeSet } from '@/src/stories/support/change-set-fixture.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { seedReviewedMarks } from '@/src/stories/support/story-review-state.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Sidebar/UnmarkAllButton',
  component: UnmarkAllButton,
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'flex w-72 justify-end bg-sidebar p-1'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof UnmarkAllButton>

export default meta

type Story = StoryObj<typeof meta>

export const WithReviewed: Story = {
  beforeEach: () => {
    seedReviewedMarks(
      changeSet.changes.slice(0, 12).map((change) => {
        return change.path
      }),
    )
  },
}

export const NothingReviewed: Story = {
  beforeEach: () => {
    seedReviewedMarks()
  },
}
