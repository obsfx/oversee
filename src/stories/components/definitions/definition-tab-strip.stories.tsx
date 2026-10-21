import type { Meta, StoryObj } from '@storybook/react-vite'
import { DefinitionTabStrip } from '@/src/components/definitions/definition-tab-strip.tsx'
import { DefinitionTabs } from '@/src/lib/definition-tabs.ts'
import { definitionTabs } from '@/src/stories/support/definition-fixture.ts'
import { stressDataset } from '@/src/stories/support/definition-stress-fixture.ts'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useTabStore } from '@/src/store/tab-store.ts'

const services = createLiveStoryServices()

const meta = {
  title: 'Components/Definitions/DefinitionTabStrip',
  component: DefinitionTabStrip,
  beforeEach: () => {
    useTabStore.setState({
      tabs: [definitionTabs.diff, definitionTabs.file, definitionTabs.external],
      activeId: definitionTabs.file.id,
    })
  },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'w-[44rem]'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof DefinitionTabStrip>

export default meta

type Story = StoryObj<typeof meta>

export const ReadOnlyActive: Story = {}

export const ReviewActive: Story = {
  beforeEach: () => {
    useTabStore.setState({ activeId: DefinitionTabs.reviewId })
  },
}

export const NoTabs: Story = {
  beforeEach: () => {
    useTabStore.setState(DefinitionTabs.initial)
  },
}

export const ManyTabs: Story = {
  beforeEach: () => {
    const { tabs, activeId } = stressDataset('many')
    useTabStore.setState({ tabs, activeId })
  },
}
