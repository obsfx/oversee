import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileProgress } from '../../primitives/file-progress.tsx'

const meta = {
  title: 'Primitives/FileProgress',
  component: FileProgress,
  args: { position: 4, total: 72, percent: (4 / 72) * 100 },
} satisfies Meta<typeof FileProgress>

export default meta

type Story = StoryObj<typeof meta>

export const Start: Story = {}

export const Last: Story = {
  args: { position: 72, total: 72, percent: 100 },
}
