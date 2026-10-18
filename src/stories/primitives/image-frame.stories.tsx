import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImageFrame } from '@/src/primitives/image-frame.tsx'
import { SAMPLE_IMAGES } from '@/src/stories/support/file-diff-fixture.ts'

const meta = {
  title: 'Primitives/ImageFrame',
  component: ImageFrame,
  args: { children: <img src={SAMPLE_IMAGES.after} alt={'Sample'} /> },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ImageFrame>

export default meta

export const Default: StoryObj<typeof meta> = {}
