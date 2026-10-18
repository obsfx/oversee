import type { Meta, StoryObj } from '@storybook/react-vite'
import { ToolbarGroup } from '@/src/primitives/toolbar-group.tsx'
import { ToolbarShell } from '@/src/primitives/toolbar-shell.tsx'

const meta = {
  title: 'Primitives/ToolbarShell',
  component: ToolbarShell,
  args: {
    children: (
      <>
        <ToolbarGroup grow>
          <span className={'text-fg-muted'}>Left group</span>
        </ToolbarGroup>
        <ToolbarGroup>
          <span className={'text-fg-muted'}>Right group</span>
        </ToolbarGroup>
      </>
    ),
  },
} satisfies Meta<typeof ToolbarShell>

export default meta

export const Default: StoryObj<typeof meta> = {}
