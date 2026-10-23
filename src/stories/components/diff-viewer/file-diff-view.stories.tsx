import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileDiffView } from '@/src/components/diff-viewer/file-diff-view.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { fileDiffFor, fixtureContents } from '@/src/stories/support/file-diff-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { resetReviewState, STORY_PATH } from '@/src/stories/support/story-review-state.ts'
import { useSymbolHighlightStore } from '@/src/store/symbol-highlight-store.ts'

const services = createStoryServices()

const newLines = fixtureContents(STORY_PATH, 'new').split('\n')

const lineOf = (needle: string, from = 0) => {
  return (
    newLines.findIndex((line, index) => {
      return index >= from && line.includes(needle)
    }) + 1
  )
}

const lineExactly = (text: string, from = 0) => {
  return (
    newLines.findIndex((line, index) => {
      return index >= from && line === text
    }) + 1
  )
}

const refreshStart = lineOf('async refresh(')
const refreshEnd = lineExactly('  }', refreshStart)
const findByIdCall = lineOf('this.sessions.findById', refreshStart)

const meta = {
  title: 'Components/DiffViewer/FileDiffView',
  component: FileDiffView,
  parameters: { layout: 'fullscreen' },
  args: {
    path: STORY_PATH,
    diff: fileDiffFor({
      path: STORY_PATH,
      status: 'modified',
      additions: 30,
      deletions: 10,
      revision: 'fixture',
    }),
  },
  beforeEach: () => {
    resetReviewState()
    useSymbolHighlightStore.getState().clear()
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

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SymbolHighlight: Story = {
  beforeEach: () => {
    useSymbolHighlightStore.getState().show({
      path: STORY_PATH,
      side: 'new',
      start: refreshStart,
      end: refreshEnd,
      focus: refreshStart,
    })
  },
}

export const CallSiteFocus: Story = {
  beforeEach: () => {
    useSymbolHighlightStore.getState().show({
      path: STORY_PATH,
      side: 'new',
      start: refreshStart,
      end: refreshEnd,
      focus: findByIdCall,
    })
  },
}
