import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'
import { LineRanges } from '@/src/lib/line-range.ts'
import { CommentRow } from '@/src/primitives/comment-row.tsx'
import { reviewComments } from '@/src/stories/support/fixtures.ts'

const [comment] = reviewComments

const meta = {
  title: 'Primitives/CommentRow',
  component: CommentRow,
  args: {
    filePath: comment.filePath,
    location: LineRanges.shortLabel(comment.range),
    body: CommentMarkdown.summary(comment.body),
    onSelect: fn(),
  },
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
