import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileDiffView } from '@/src/components/diff-viewer/file-diff-view.tsx'
import { VirtualizedScroller } from '@/src/components/diff-viewer/virtualized-scroller.tsx'
import { fileDiffFor, LARGE_FILE_PATH } from '@/src/stories/support/file-diff-fixture.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { resetReviewState } from '@/src/stories/support/story-review-state.ts'

const services = createStoryServices()
const diff = fileDiffFor({
  path: LARGE_FILE_PATH,
  status: 'modified',
  additions: 20,
  deletions: 20,
})

const meta = {
  title: 'Components/DiffViewer/VirtualizedScroller',
  component: VirtualizedScroller,
  parameters: { layout: 'fullscreen' },
  args: {
    className: 'h-screen overflow-auto',
    children: <FileDiffView path={LARGE_FILE_PATH} diff={diff} />,
  },
  beforeEach: () => {
    resetReviewState(LARGE_FILE_PATH)
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
} satisfies Meta<typeof VirtualizedScroller>

export default meta

export const LargeFile: StoryObj<typeof meta> = {}
