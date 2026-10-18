import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiffStatBlocks } from '../../primitives/diff-stat-blocks.tsx'

const meta = {
  title: 'Primitives/DiffStatBlocks',
  component: DiffStatBlocks,
  args: { added: 3, deleted: 2, neutral: 0 },
} satisfies Meta<typeof DiffStatBlocks>

export default meta

type Story = StoryObj<typeof meta>

export const Mixed: Story = {}

export const OnlyAdditions: Story = {
  args: { added: 5, deleted: 0, neutral: 0 },
}

export const NoChanges: Story = {
  args: { added: 0, deleted: 0, neutral: 5 },
}
