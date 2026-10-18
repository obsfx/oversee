import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FileNavigator } from '@/src/components/toolbar/file-navigator.tsx'

const meta = {
  title: 'Components/Toolbar/FileNavigator',
  component: FileNavigator,
  args: {
    position: 4,
    total: 72,
    percent: (4 / 72) * 100,
    canPrevious: true,
    canNext: true,
    onPrevious: fn(),
    onNext: fn(),
  },
} satisfies Meta<typeof FileNavigator>

export default meta

type Story = StoryObj<typeof meta>

export const Middle: Story = {}

export const First: Story = {
  args: { position: 1, percent: (1 / 72) * 100, canPrevious: false },
}

export const Last: Story = {
  args: { position: 72, percent: 100, canNext: false },
}
