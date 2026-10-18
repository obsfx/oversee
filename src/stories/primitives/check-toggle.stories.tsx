import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckToggle } from '../../primitives/check-toggle.tsx'

const meta = {
  title: 'Primitives/CheckToggle',
  component: CheckToggle,
  args: { checked: false, children: 'Reviewed' },
} satisfies Meta<typeof CheckToggle>

export default meta

type Story = StoryObj<typeof meta>

export const Unchecked: Story = {}

export const Checked: Story = {
  args: { checked: true },
}
