import type { Meta, StoryObj } from '@storybook/react-vite'
import { Spinner } from '../../primitives/spinner.tsx'

const meta = {
  title: 'Primitives/Spinner',
  component: Spinner,
} satisfies Meta<typeof Spinner>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Large: Story = { args: { className: 'text-xl' } }
