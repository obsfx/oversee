import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiffStat } from '../../primitives/diff-stat.tsx'

const meta = {
  title: 'Primitives/DiffStat',
  component: DiffStat,
  args: { additions: 1343, deletions: 953 },
} satisfies Meta<typeof DiffStat>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OnlyAdditions: Story = {
  args: { additions: 116, deletions: 0 },
}
