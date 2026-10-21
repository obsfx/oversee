import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ReviewSessionLoader } from '@/src/components/topbar/review-session-loader.tsx'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createStoryServices()

const meta = {
  title: 'Components/Topbar/ReviewSessionLoader',
  component: ReviewSessionLoader,
  args: { sessionId: 's2', backLabel: 'Back to notifications', onBack: fn(), onNavigate: fn() },
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
} satisfies Meta<typeof ReviewSessionLoader>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Missing: Story = { args: { sessionId: 'unknown' } }
