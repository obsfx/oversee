import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { DefinitionPopoverContent } from '@/src/components/definitions/definition-popover-content.tsx'
import type { DefinitionLookup } from '@/src/lib/definition-gateway.ts'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { definitionLookups } from '@/src/stories/support/definition-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'

const services = createLiveStoryServices()

const ready = (lookup: DefinitionLookup) => {
  return { status: 'ready' as const, lookup }
}

const meta = {
  title: 'Components/Definitions/DefinitionPopoverContent',
  component: DefinitionPopoverContent,
  args: { state: ready(definitionLookups.single), onOpen: fn() },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <div className={'w-[28rem] rounded-md border border-line bg-popup'}>
            <Story />
          </div>
        </StoryFrame>
      )
    },
  ],
} satisfies Meta<typeof DefinitionPopoverContent>

export default meta

type Story = StoryObj<typeof meta>

export const OneDefinition: Story = {}

export const SameFile: Story = { args: { state: ready(definitionLookups.sameFile) } }

export const SeveralDefinitions: Story = { args: { state: ready(definitionLookups.several) } }

export const External: Story = { args: { state: ready(definitionLookups.external) } }

export const Loading: Story = { args: { state: { status: 'loading' } } }

export const NoDefinition: Story = { args: { state: ready(definitionLookups.empty) } }

export const NotInstalled: Story = { args: { state: ready(definitionLookups.notInstalled) } }

export const NeedsCheckout: Story = { args: { state: ready(definitionLookups.needsCheckout) } }

export const Starting: Story = { args: { state: ready(definitionLookups.starting) } }

export const Indexing: Story = { args: { state: ready(definitionLookups.indexing) } }

export const Failed: Story = { args: { state: ready(definitionLookups.failed) } }

export const Unsupported: Story = { args: { state: ready(definitionLookups.unsupported) } }

export const RequestFailed: Story = {
  args: { state: { status: 'failed', error: new Error('/api/definitions: request failed') } },
}
