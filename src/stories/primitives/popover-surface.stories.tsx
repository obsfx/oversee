import { Popover } from '@base-ui/react/popover'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscSettingsGear } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { MutedHint } from '@/src/primitives/muted-hint.tsx'
import { PopoverSurface } from '@/src/primitives/popover-surface.tsx'

const meta = {
  title: 'Primitives/PopoverSurface',
  component: PopoverSurface,
  args: { align: 'start', className: 'w-60', children: <MutedHint>Popover content</MutedHint> },
  render: (args) => {
    return (
      <Popover.Root defaultOpen>
        <Popover.Trigger render={<IconButton />} aria-label={'Open'}>
          <VscSettingsGear />
        </Popover.Trigger>
        <PopoverSurface {...args} />
      </Popover.Root>
    )
  },
} satisfies Meta<typeof PopoverSurface>

export default meta

type Story = StoryObj<typeof meta>

export const AlignStart: Story = {}

export const AlignEnd: Story = { args: { align: 'end' } }
