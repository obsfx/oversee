import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImagePane } from '@/src/components/diff-viewer/image-pane.tsx'
import { SAMPLE_IMAGES } from '@/src/stories/support/file-diff-fixture.ts'

const meta = {
  title: 'Components/DiffViewer/ImagePane',
  component: ImagePane,
  args: { tone: 'after', label: 'Added', src: SAMPLE_IMAGES.after },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ImagePane>

export default meta

export const Default: StoryObj<typeof meta> = {}
