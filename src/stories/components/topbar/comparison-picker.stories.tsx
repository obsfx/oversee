import type { Meta, StoryObj } from '@storybook/react-vite'
import { ComparisonPicker } from '../../../components/topbar/comparison-picker.tsx'
import type { Services } from '../../../lib/services.ts'
import { createStoryServices, neverResolves, rejectsWith } from '../../support/fixtures.ts'
import { StoryFrame } from '../../support/story-frame.tsx'

const meta = {
  title: 'Components/Topbar/ComparisonPicker',
  component: ComparisonPicker,
  args: { services: createStoryServices() },
  argTypes: { services: { table: { disable: true } } },
  render: ({ services }) => {
    return (
      <StoryFrame services={services}>
        <ComparisonPicker />
      </StoryFrame>
    )
  },
} satisfies Meta<{ services: Services }>

export default meta

type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Loading: Story = {
  args: { services: createStoryServices({ branches: neverResolves }) },
}

export const Failed: Story = {
  args: {
    services: createStoryServices({ branches: rejectsWith('get-branches: request failed') }),
  },
}
