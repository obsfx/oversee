import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileContentView } from '@/src/components/definitions/file-content-view.tsx'
import { VirtualizedScroller } from '@/src/components/diff-viewer/virtualized-scroller.tsx'
import type { DefinitionTab } from '@/src/lib/definition-tabs.ts'
import { FileContentRequests } from '@/src/lib/file-content-gateway.ts'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { definitionFiles, definitionTabs } from '@/src/stories/support/definition-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createLiveStoryServices()

const contentOf = (tab: DefinitionTab) => {
  const request = { path: tab.path, external: tab.external }
  const key = FileContentRequests.key(request)
  return { ...request, contents: definitionFiles.get(key) ?? '', cacheKey: key }
}

const meta = {
  title: 'Components/Definitions/FileContentView',
  component: FileContentView,
  args: { tab: definitionTabs.file, content: contentOf(definitionTabs.file) },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'-m-3 h-screen'}>
            <VirtualizedScroller className={'h-full overflow-auto'}>
              <Story />
            </VirtualizedScroller>
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof FileContentView>

export default meta

type Story = StoryObj<typeof meta>

export const InRepository: Story = {}

export const External: Story = {
  args: { tab: definitionTabs.external, content: contentOf(definitionTabs.external) },
}
