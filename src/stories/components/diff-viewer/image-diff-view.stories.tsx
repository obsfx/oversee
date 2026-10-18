import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImageDiffView } from '@/src/components/diff-viewer/image-diff-view.tsx'
import { SAMPLE_IMAGES } from '@/src/stories/support/file-diff-fixture.ts'

const meta = {
  title: 'Components/DiffViewer/ImageDiffView',
  component: ImageDiffView,
  parameters: { layout: 'fullscreen' },
  args: { images: SAMPLE_IMAGES },
} satisfies Meta<typeof ImageDiffView>

export default meta

type Story = StoryObj<typeof meta>

export const Modified: Story = {}

export const Added: Story = { args: { images: { before: null, after: SAMPLE_IMAGES.after } } }

export const Deleted: Story = { args: { images: { before: SAMPLE_IMAGES.before, after: null } } }
