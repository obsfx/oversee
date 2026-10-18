import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiffAnnotation } from '@/src/components/diff-viewer/diff-annotation.tsx'
import { createStoryServices, reviewComments } from '@/src/stories/support/fixtures.ts'
import { StoryAnnotationFrame } from '@/src/stories/support/story-annotation-frame.tsx'
import { STORY_PATH } from '@/src/stories/support/story-review-state.ts'

const services = createStoryServices()
const range = { start: 12, end: 18, side: 'additions', endSide: 'additions' } as const

const meta = {
  title: 'Components/DiffViewer/DiffAnnotation',
  component: DiffAnnotation,
  args: { path: STORY_PATH, meta: { kind: 'comments', comments: reviewComments.slice(0, 2) } },
  decorators: [
    (Story) => {
      return (
        <StoryAnnotationFrame services={services}>
          <Story />
        </StoryAnnotationFrame>
      )
    },
  ],
} satisfies Meta<typeof DiffAnnotation>

export default meta

type Story = StoryObj<typeof meta>

export const Comments: Story = {}

export const Selection: Story = { args: { meta: { kind: 'selection', range } } }

export const Composer: Story = { args: { meta: { kind: 'composer', range, comment: null } } }
