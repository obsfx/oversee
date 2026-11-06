import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, userEvent, within } from 'storybook/test'
import { CommentReaderDialog } from '@/src/components/topbar/comment-reader-dialog.tsx'
import { useCommentReader } from '@/src/hooks/use-comment-reader.ts'
import type { SessionComment } from '@/src/lib/review-session-gateway.ts'
import { Button } from '@/src/primitives/button.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { reviewSessions } from '@/src/stories/support/review-session-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()
const [outdatedSession, repliedSession] = reviewSessions

interface ReaderHarnessProps {
  comments: SessionComment[]
  commentId: string
  onNavigate: () => void
}

function ReaderHarness({ comments, commentId, onNavigate }: ReaderHarnessProps) {
  const reader = useCommentReader(comments)

  return (
    <>
      <Button
        variant={'ghost'}
        onClick={() => {
          reader.show(commentId)
        }}
      >
        Open reader
      </Button>
      <CommentReaderDialog reader={reader} onNavigate={onNavigate} />
    </>
  )
}

const meta = {
  title: 'Components/Topbar/CommentReaderDialog',
  component: ReaderHarness,
  args: { comments: repliedSession.comments, commentId: 's2c4', onNavigate: fn() },
  argTypes: { comments: { table: { disable: true } } },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'p-4'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open reader' }))
  },
} satisfies Meta<typeof ReaderHarness>

export default meta

type Story = StoryObj<typeof meta>

export const LongReply: Story = {}

export const Diagram: Story = { args: { commentId: 's2c3' } }

export const FirstComment: Story = { args: { commentId: 's2c1' } }

export const Outdated: Story = {
  args: { comments: outdatedSession.comments, commentId: outdatedSession.comments[1].id },
}

export const SingleComment: Story = {
  args: { comments: repliedSession.comments.slice(0, 1), commentId: 's2c1' },
}
