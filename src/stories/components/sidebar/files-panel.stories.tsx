import type { Meta, StoryObj } from '@storybook/react-vite'
import { FilesPanel } from '@/src/components/sidebar/files-panel.tsx'
import type { Services } from '@/src/lib/services.ts'
import { SidebarShell } from '@/src/primitives/sidebar-shell.tsx'
import { createStoryServices, neverResolves, rejectsWith } from '@/src/stories/support/fixtures.ts'
import { seedReviewedMarks } from '@/src/stories/support/story-review-state.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Sidebar/FilesPanel',
  component: FilesPanel,
  parameters: { layout: 'fullscreen' },
  args: { services: createStoryServices() },
  beforeEach: () => {
    seedReviewedMarks()
  },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'-m-3 h-screen w-80'}>
          <SidebarShell>
            <FilesPanel />
          </SidebarShell>
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const WithReviewed: Story = {
  beforeEach: () => {
    seedReviewedMarks([
      '.env.template',
      '.gitignore',
      'scripts/alpha_user_subscribe.ts',
      'scripts/expire_password.ts',
    ])
  },
}

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
