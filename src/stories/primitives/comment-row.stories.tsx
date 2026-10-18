import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CommentRow } from '../../primitives/comment-row.tsx'
import { reviewComments } from '../support/fixtures.ts'

const [comment] = reviewComments

const meta = {
  title: 'Primitives/CommentRow',
  component: CommentRow,
  args: { filePath: comment.filePath, line: comment.line, body: comment.body, onSelect: fn() },
  decorators: [
    (Story) => {
      return (
        <div className={'w-80'}>
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof CommentRow>

export default meta

export const Default: StoryObj<typeof meta> = {}
