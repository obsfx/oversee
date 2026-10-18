import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProgressTrack } from '../../primitives/progress-track.tsx'

const meta = {
  title: 'Primitives/ProgressTrack',
  component: ProgressTrack,
  decorators: [
    (Story) => {
      return (
        <div className={'flex w-64 bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
  args: { reviewed: 12, total: 80, percent: 15 },
} satisfies Meta<typeof ProgressTrack>

export default meta

type Story = StoryObj<typeof meta>

export const Partial: Story = {}

export const Empty: Story = {
  args: { reviewed: 0, total: 80, percent: 0 },
}

export const Complete: Story = {
  args: { reviewed: 80, total: 80, percent: 100 },
}
