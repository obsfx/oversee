import type { Meta, StoryObj } from '@storybook/react-vite'
import { TabPanel } from '@/src/components/definitions/tab-panel.tsx'
import { DefinitionTabs } from '@/src/lib/definition-tabs.ts'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { definitionTabs } from '@/src/stories/support/definition-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { useComparisonStore } from '@/src/store/comparison-store.ts'
import { useNavigationStore } from '@/src/store/navigation-store.ts'
import { useTabStore } from '@/src/store/tab-store.ts'

const services = createLiveStoryServices()

const showTab = (activeId: string) => {
  return () => {
    useComparisonStore.setState({ selected: null, notice: null })
    useNavigationStore.setState({ selectedPath: 'scripts/expire_password.ts' })
    useTabStore.setState({
      tabs: [definitionTabs.diff, definitionTabs.file, definitionTabs.external],
      activeId,
    })
  }
}

const meta = {
  title: 'Components/Definitions/TabPanel',
  component: TabPanel,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'-m-3 flex h-screen flex-col'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof TabPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Review: Story = { beforeEach: showTab(DefinitionTabs.reviewId) }

export const DiffTab: Story = { beforeEach: showTab(definitionTabs.diff.id) }

export const ReadOnlyTab: Story = { beforeEach: showTab(definitionTabs.file.id) }

export const ExternalTab: Story = { beforeEach: showTab(definitionTabs.external.id) }
