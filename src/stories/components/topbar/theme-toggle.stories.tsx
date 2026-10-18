import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ThemeToggle } from '@/src/components/topbar/theme-toggle.tsx'

const meta = {
  title: 'Components/Topbar/ThemeToggle',
  component: ThemeToggle,
  args: { value: 'light', onChange: fn() },
} satisfies Meta<typeof ThemeToggle>

export default meta

type Story = StoryObj<typeof meta>

export const Light: Story = {}

export const Dark: Story = { args: { value: 'dark' } }
