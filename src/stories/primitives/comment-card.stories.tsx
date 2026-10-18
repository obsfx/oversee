import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommentCard } from '@/src/primitives/comment-card.tsx'

const meta = {
  title: 'Primitives/CommentCard',
  component: CommentCard,
  args: {
    variant: 'note',
    children: (
      <>
        <div className={'px-3 py-2'}>First comment</div>
        <div className={'px-3 py-2'}>Second comment</div>
      </>
    ),
  },
} satisfies Meta<typeof CommentCard>

export default meta

type Story = StoryObj<typeof meta>

export const Note: Story = {}

export const Composer: Story = {
  args: { variant: 'composer', children: <div className={'px-2 py-3'}>Composer content</div> },
}
