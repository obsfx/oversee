import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReviewedMark } from '@/src/primitives/reviewed-mark.tsx'

const meta = {
  title: 'Primitives/ReviewedMark',
  component: ReviewedMark,
  args: { reviewed: true },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ReviewedMark>

export default meta

type Story = StoryObj<typeof meta>

export const Reviewed: Story = {}

export const NotReviewed: Story = { args: { reviewed: false } }
