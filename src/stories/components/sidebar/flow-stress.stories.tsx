import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  type StressData,
  stressDataOptions,
} from '@/src/stories/support/definition-stress-fixture.ts'
import { StressFlowStory } from '@/src/stories/support/stress-flow-story.tsx'

interface StressArgs {
  data: StressData
}

const meta: Meta<StressArgs> = {
  title: 'Components/Sidebar/StressTest',
  args: { data: 'worst' },
  argTypes: {
    data: { control: 'inline-radio', options: stressDataOptions },
  },
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<StressArgs>

export const Flow: Story = { render: StressFlowStory }
