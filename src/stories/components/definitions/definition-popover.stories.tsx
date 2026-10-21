import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { DefinitionPopover } from '@/src/components/definitions/definition-popover.tsx'
import { createLiveStoryServices } from '@/src/stories/support/fixtures.ts'
import { definitionLookups } from '@/src/stories/support/definition-fixture.ts'
import { StoryFrame } from '@/src/stories/support/story-frame.tsx'
import { StoryTokenAnchor } from '@/src/stories/support/story-token-anchor.tsx'

const services = createLiveStoryServices()

const meta = {
  title: 'Components/Definitions/DefinitionPopover',
  component: DefinitionPopover,
  args: {
    token: null,
    visible: true,
    state: { status: 'ready', lookup: definitionLookups.several },
    popover: { onPointerEnter: fn(), onPointerLeave: fn(), close: fn() },
    onOpen: fn(),
  },
  decorators: [
    (Story) => {
      return (
        <StoryFrame services={services}>
          <Story />
        </StoryFrame>
      )
    },
  ],
  render: (args) => {
    return (
      <StoryTokenAnchor text={'info'}>
        {(token) => {
          return <DefinitionPopover {...args} token={token} />
        }}
      </StoryTokenAnchor>
    )
  },
} satisfies Meta<typeof DefinitionPopover>

export default meta

type Story = StoryObj<typeof meta>

export const SeveralDefinitions: Story = {}

export const Indexing: Story = {
  args: { state: { status: 'ready', lookup: definitionLookups.indexing } },
}

export const Hidden: Story = { args: { visible: false } }
