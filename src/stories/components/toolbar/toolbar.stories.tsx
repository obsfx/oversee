import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toolbar } from '../../../components/toolbar/toolbar.tsx'
import type { Services } from '../../../lib/services.ts'
import { createStoryServices, neverResolves } from '../../support/fixtures.ts'
import { StoryFrame } from '../../support/story-frame.tsx'

const meta = {
  title: 'Components/Toolbar/Toolbar',
  component: Toolbar,
  parameters: { layout: 'fullscreen' },
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <div className={'-m-3'}>
          <Toolbar />
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
