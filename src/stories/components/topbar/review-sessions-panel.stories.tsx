import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { ReviewSessionsPanel } from '@/src/components/topbar/review-sessions-panel.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const ConnectedPanel = () => {
  const [openedId, setOpenedId] = useState<string | null>(null)

  return (
    <ReviewSessionsPanel
      openedSessionId={openedId}
      onOpen={setOpenedId}
      onBack={() => {
        setOpenedId(null)
      }}
      onNavigate={fn()}
    />
  )
}

const meta = {
  title: 'Components/Topbar/ReviewSessionsPanel',
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'w-[26rem] rounded-md border border-line bg-popup'}>
          <ConnectedPanel />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const WithSessions: Story = {}

export const Empty: Story = { args: { services: createStoryServices({ sessions: [] }) } }
