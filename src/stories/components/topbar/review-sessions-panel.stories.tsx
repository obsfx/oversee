import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ReviewSessionsPanel } from '@/src/components/topbar/review-sessions-panel.tsx'
import { useReviewSessions } from '@/src/hooks/use-review-sessions.ts'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const ConnectedPanel = () => {
  const { list } = useReviewSessions()
  const [openedId, setOpenedId] = useState<string | null>(null)
  const opened =
    list.find((session) => {
      return session.id === openedId
    }) ?? null

  return (
    <ReviewSessionsPanel
      openedSession={opened}
      onOpen={setOpenedId}
      onBack={() => {
        setOpenedId(null)
      }}
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
