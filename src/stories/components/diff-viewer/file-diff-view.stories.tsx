import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileDiffView } from '@/src/components/diff-viewer/file-diff-view.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { fileDiffFor } from '@/src/stories/support/file-diff-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { resetReviewState, STORY_PATH } from '@/src/stories/support/story-review-state.ts'

const services = createStoryServices()

const meta = {
  title: 'Components/DiffViewer/FileDiffView',
  component: FileDiffView,
  parameters: { layout: 'fullscreen' },
  args: {
    path: STORY_PATH,
    diff: fileDiffFor({ path: STORY_PATH, status: 'modified', additions: 30, deletions: 10 }),
  },
  beforeEach: () => {
    resetReviewState()
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
} satisfies Meta<typeof FileDiffView>

export default meta

export const Default: StoryObj<typeof meta> = {}
