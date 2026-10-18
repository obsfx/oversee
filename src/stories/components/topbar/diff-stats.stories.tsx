import type { Meta, StoryObj } from '@storybook/react-vite'
import { DiffStats } from '@/src/components/topbar/diff-stats.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices, neverResolves } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/DiffStats',
  component: DiffStats,
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <DiffStats />
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Loading: Story = {
  args: { services: createStoryServices({ changeSets: neverResolves }) },
}
