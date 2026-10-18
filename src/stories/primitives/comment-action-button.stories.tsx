import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscEdit } from 'react-icons/vsc'
import { CommentActionButton } from '@/src/primitives/comment-action-button.tsx'

const meta = {
  title: 'Primitives/CommentActionButton',
  component: CommentActionButton,
  args: { 'aria-label': 'Edit comment', children: <VscEdit /> },
} satisfies Meta<typeof CommentActionButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { disabled: true } }
