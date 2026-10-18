import type { Meta, StoryObj } from '@storybook/react-vite'
import { SegmentedOption } from '../../primitives/segmented-option.tsx'

const meta = {
  title: 'Primitives/SegmentedOption',
  component: SegmentedOption,
  args: { active: false, children: 'dark' },
} satisfies Meta<typeof SegmentedOption>

export default meta

type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Active: Story = { args: { active: true } }
