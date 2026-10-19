import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CurrentCommentsPanel } from '@/src/components/topbar/current-comments-panel.tsx'
import type { Services } from '@/src/lib/services.ts'
import {
  createStoryServices,
  outdatedReviewComments,
  reviewCommentsWithOutdated,
} from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/CurrentCommentsPanel',
  component: CurrentCommentsPanel,
  args: { services: createStoryServices(), onNavigate: fn(), onOpenOutdated: fn() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services, onNavigate, onOpenOutdated }) => {
    return (
      <StoryFrame services={services}>
        <div className={'w-[26rem] rounded-md border border-line bg-popup'}>
          <CurrentCommentsPanel onNavigate={onNavigate} onOpenOutdated={onOpenOutdated} />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services; onNavigate: () => void; onOpenOutdated: () => void }>

export default meta

type Story = StoryObj<typeof meta>

export const WithComments: Story = {}

export const WithOutdated: Story = {
  args: { services: createStoryServices({ comments: reviewCommentsWithOutdated }) },
}

export const OnlyOutdated: Story = {
  args: { services: createStoryServices({ comments: outdatedReviewComments }) },
}

export const Empty: Story = { args: { services: createStoryServices({ comments: [] }) } }
