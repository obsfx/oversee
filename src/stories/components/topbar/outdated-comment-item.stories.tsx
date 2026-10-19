import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OutdatedCommentItem } from '@/src/components/topbar/outdated-comment-item.tsx'
import {
  createStoryServices,
  outdatedReviewComments,
  reviewCommentsWithOutdated,
} from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices({ comments: reviewCommentsWithOutdated })

const meta = {
  title: 'Components/Topbar/OutdatedCommentItem',
  component: OutdatedCommentItem,
  args: { comment: outdatedReviewComments[0], onNavigate: fn() },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'w-[26rem] rounded-md border border-line bg-popup'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof OutdatedCommentItem>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutSavedLines: Story = {
  args: { comment: { ...outdatedReviewComments[1], lines: [] } },
}

export const FileNotInDiff: Story = {
  args: { comment: { ...outdatedReviewComments[0], filePath: 'src/legacy/removed-auth.ts' } },
}
