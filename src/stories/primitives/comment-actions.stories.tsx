import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscEdit, VscTrash } from 'react-icons/vsc'
import { CommentActionButton } from '@/src/primitives/comment-action-button.tsx'
import { CommentActions } from '@/src/primitives/comment-actions.tsx'
import { CommentEntry } from '@/src/primitives/comment-entry.tsx'

const meta = {
  title: 'Primitives/CommentActions',
  component: CommentActions,
  args: {
    children: (
      <>
        <CommentActionButton aria-label={'Edit comment'}>
          <VscEdit />
        </CommentActionButton>
        <CommentActionButton aria-label={'Delete comment'}>
          <VscTrash />
        </CommentActionButton>
      </>
    ),
  },
  decorators: [
    (Story) => {
      return (
        <div className={'w-96 rounded-lg border border-line bg-popup'}>
          <CommentEntry>
            <p className={'pr-16'}>Hover the note to reveal the actions.</p>
            <Story />
          </CommentEntry>
        </div>
      )
    },
  ],
} satisfies Meta<typeof CommentActions>

export default meta

export const Default: StoryObj<typeof meta> = {}
