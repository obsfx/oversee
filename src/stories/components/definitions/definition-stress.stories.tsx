import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  type StressData,
  stressDataOptions,
} from '@/src/stories/support/definition-stress-fixture.ts'
import { StressPopoversStory } from '@/src/stories/support/stress-popovers-story.tsx'
import { StressTabsStory } from '@/src/stories/support/stress-tabs-story.tsx'

interface StressArgs {
  data: StressData
}

const meta: Meta<StressArgs> = {
  title: 'Components/Definitions/StressTest',
  args: { data: 'worst' },
  argTypes: {
    data: { control: 'inline-radio', options: stressDataOptions },
  },
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj<StressArgs>

export const Tabs: Story = { render: StressTabsStory }

export const Popovers: Story = { render: StressPopoversStory }
