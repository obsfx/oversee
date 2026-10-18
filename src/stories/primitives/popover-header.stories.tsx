import type { Meta, StoryObj } from '@storybook/react-vite'
import { PopoverHeader } from '../../primitives/popover-header.tsx'

const meta = {
  title: 'Primitives/PopoverHeader',
  component: PopoverHeader,
  args: { title: 'Comments', meta: '3 comments' },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80 border border-line'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof PopoverHeader>

export default meta

export const Default: StoryObj<typeof meta> = {}
