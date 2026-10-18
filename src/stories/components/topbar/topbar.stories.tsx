import type { Meta, StoryObj } from '@storybook/react-vite'
import { Topbar } from '../../../components/topbar/topbar.tsx'
import type { Services } from '../../../lib/services.ts'
import { createStoryServices, neverResolves, rejectsWith } from '../../support/fixtures.ts'
import { StoryFrame } from '../../support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/Topbar',
  component: Topbar,
  parameters: { layout: 'fullscreen' },
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'-m-3'}>
          <Topbar />
        </div>
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const BranchesLoading: Story = {
  args: { services: createStoryServices({ branches: neverResolves }) },
}

export const BranchesFailed: Story = {
  args: {
    services: createStoryServices({ branches: rejectsWith('get-branches: request failed') }),
  },
}

export const NoComments: Story = {
  args: { services: createStoryServices({ comments: [] }) },
}
