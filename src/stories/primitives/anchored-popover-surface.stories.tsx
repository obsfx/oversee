import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AnchoredPopoverSurface } from '@/src/primitives/anchored-popover-surface.tsx'
import { StoryTokenAnchor } from '@/src/stories/support/story-token-anchor.tsx'

const meta = {
  title: 'Primitives/AnchoredPopoverSurface',
  component: AnchoredPopoverSurface,
  args: {
    open: true,
    anchor: null,
    className: 'w-72 p-2',
    onPointerEnter: fn(),
    onPointerLeave: fn(),
    onClose: fn(),
    children: 'Anchored to the token, opens below it and flips when there is no room.',
  },
  render: (args) => {
    return (
      <StoryTokenAnchor text={'nextExpiry'}>
        {(token) => {
          return <AnchoredPopoverSurface {...args} anchor={token?.element ?? null} />
        }}
      </StoryTokenAnchor>
    )
  },
} satisfies Meta<typeof AnchoredPopoverSurface>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = { args: { open: false } }
