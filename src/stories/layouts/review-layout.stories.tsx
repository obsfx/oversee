import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReviewLayout } from '@/src/layouts/review-layout.tsx'
import { ComparisonRules } from '@/src/lib/comparison-rules.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useComparisonStore } from '@/src/store/comparison-store.ts'

const services = createStoryServices()

const meta = {
  title: 'Layouts/ReviewLayout',
  component: ReviewLayout,
  parameters: { layout: 'fullscreen' },
  beforeEach: () => {
    useComparisonStore.setState({ selected: null, notice: null })
  },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'-m-3'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof ReviewLayout>

export default meta

export const Default: StoryObj<typeof meta> = {}

export const DeletedBranch: StoryObj<typeof meta> = {
  beforeEach: () => {
    const comparison = { source: ComparisonRules.uncommitted, target: 'main' }
    useComparisonStore.setState({
      selected: comparison,
      notice: { comparison, deleted: ['feat/comment-threads'] },
    })
  },
}
