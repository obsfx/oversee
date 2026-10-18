import type { Meta, StoryObj } from '@storybook/react-vite'
import { WorkspaceCrumb } from '@/src/components/topbar/workspace-crumb.tsx'
import type { Services } from '@/src/lib/services.ts'
import { createStoryServices, workspaceInfo } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/WorkspaceCrumb',
  component: WorkspaceCrumb,
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'flex items-center gap-1'}>
          <WorkspaceCrumb />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const RepoRoot: Story = {}

export const RepoSubdirectory: Story = {
  args: {
    services: createStoryServices({
      workspace: () => {
        return Promise.resolve({ ...workspaceInfo, repoName: 'storyvine' })
      },
    }),
  },
}
