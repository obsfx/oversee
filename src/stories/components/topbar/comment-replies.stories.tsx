import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentReplies } from '@/src/components/topbar/comment-replies.tsx'

const HOUR = 60 * 60 * 1000

const meta = {
  title: 'Components/Topbar/CommentReplies',
  component: CommentReplies,
  args: {
    replies: [
      {
        id: 'r1',
        commentId: 'c1',
        author: 'agent',
        body: 'Checked this, the value is validated in the **config loader** already.',
        createdAt: Date.now() - 2 * HOUR,
      },
      {
        id: 'r2',
        commentId: 'c1',
        author: 'agent',
        body: 'Added a comment explaining the unit.',
        createdAt: Date.now() - 5 * 60 * 1000,
      },
    ],
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 text-xs'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof CommentReplies>

export default meta

export const Default: StoryObj<typeof meta> = {}
