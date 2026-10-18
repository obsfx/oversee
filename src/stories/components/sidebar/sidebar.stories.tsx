import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sidebar } from '@/src/components/sidebar/sidebar.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices, neverResolves, rejectsWith } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Sidebar/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'-m-3 h-screen w-80'}>
          <Sidebar />
        </div>
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

export const Failed: Story = {
  args: {
    services: createStoryServices({ changeSets: rejectsWith('get-file-tree: request failed') }),
  },
}

export const Empty: Story = {
  args: {
    services: createStoryServices({
      changeSets: () => {
        return Promise.resolve({ changes: [] })
      },
    }),
  },
}

export const BranchesFailed: Story = {
  args: {
    services: createStoryServices({ branches: rejectsWith('get-branches: request failed') }),
  },
}
