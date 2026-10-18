import type { Meta, StoryObj } from '@storybook/react-vite'
import { PopoverScrollArea } from '@/src/primitives/popover-scroll-area.tsx'

const meta = {
  title: 'Primitives/PopoverScrollArea',
  component: PopoverScrollArea,
  args: {
    children: Array.from({ length: 40 }, (_, index) => {
      return (
        <div key={index} className={'px-1.5 py-1'}>
          Row {index + 1}
        </div>
      )
    }),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80 border border-line text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof PopoverScrollArea>

export default meta

export const Default: StoryObj<typeof meta> = {}
