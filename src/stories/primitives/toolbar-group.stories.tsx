import type { Meta, StoryObj } from '@storybook/react-vite'
import { VscFold } from 'react-icons/vsc'
import { IconButton } from '@/src/primitives/icon-button.tsx'
import { ToolbarGroup } from '@/src/primitives/toolbar-group.tsx'

const meta = {
  title: 'Primitives/ToolbarGroup',
  component: ToolbarGroup,
  args: {
    children: (
      <>
        <IconButton aria-label={'Expand unchanged sections'}>
          <VscFold />
        </IconButton>
        <span className={'text-fg-muted'}>src/modules/auth/session.service.ts</span>
      </>
    ),
  },
} satisfies Meta<typeof ToolbarGroup>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Grow: Story = {
  args: { grow: true },
}
