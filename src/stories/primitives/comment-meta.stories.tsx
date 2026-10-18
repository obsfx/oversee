import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentMeta } from '@/src/primitives/comment-meta.tsx'

const meta = {
  title: 'Primitives/CommentMeta',
  component: CommentMeta,
  args: { items: ['Lines 53-56', '8m ago'] },
} satisfies Meta<typeof CommentMeta>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Edited: Story = { args: { items: ['Line 24', '42m ago', 'edited'] } }
