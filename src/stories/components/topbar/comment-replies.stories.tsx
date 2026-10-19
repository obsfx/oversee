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

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const MultiParagraph: Story = {
  args: {
    replies: [
      {
        id: 'r3',
        commentId: 'c1',
        author: 'agent',
        body: [
          'Kept the early return, the audit log is written by the **session guard** before this runs.',
          '',
          'What I changed instead:',
          '',
          '- moved the check into `assertSession`',
          '- added a test for the failed login path',
          '',
          'Let me know if you still want the log here.',
        ].join('\n'),
        createdAt: Date.now() - 10 * 60 * 1000,
      },
    ],
  },
}

export const SingleNewlines: Story = {
  args: {
    replies: [
      {
        id: 'r4',
        commentId: 'c1',
        author: 'agent',
        body: [
          'Checked both call sites.',
          'importer.ts now reads the new constant.',
          'nightly-sync already went through the config.',
          '- no other readers',
          'Closing this one.',
        ].join('\n'),
        createdAt: Date.now() - 2 * 60 * 1000,
      },
    ],
  },
}
