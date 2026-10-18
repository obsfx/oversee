import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentEntry } from '@/src/primitives/comment-entry.tsx'
import { CommentMeta } from '@/src/primitives/comment-meta.tsx'

const meta = {
  title: 'Primitives/CommentEntry',
  component: CommentEntry,
  args: {
    children: (
      <>
        <p>Comment body sits on top, meta underneath.</p>
        <CommentMeta items={['Lines 53-56', '8m ago']} />
      </>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 rounded-lg border border-line bg-popup'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof CommentEntry>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Highlighted: Story = { args: { highlighted: true } }
