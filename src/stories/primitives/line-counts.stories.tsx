import type { Meta, StoryObj } from '@storybook/react-vite'
import { LineCounts } from '@/src/primitives/line-counts.tsx'

const meta = {
  title: 'Primitives/LineCounts',
  component: LineCounts,
  args: { additions: 19, deletions: 6, title: '19 lines added, 6 removed' },
  decorators: [
    (Story) => {
      return (
        <div className={'inline-flex bg-sidebar p-2 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof LineCounts>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OnlyAdded: Story = {
  args: { additions: 30, deletions: 0, title: '30 lines added, 0 removed' },
}

export const OnlyRemoved: Story = {
  args: { additions: 0, deletions: 42, title: '0 lines added, 42 removed' },
}

export const Large: Story = {
  args: { additions: 12480, deletions: 9311, title: '12480 lines added, 9311 removed' },
}
