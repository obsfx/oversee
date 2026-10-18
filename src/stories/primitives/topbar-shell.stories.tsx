import type { Meta, StoryObj } from '@storybook/react-vite'
import { MutedHint } from '../../primitives/muted-hint.tsx'
import { TopbarGroup } from '../../primitives/topbar-group.tsx'
import { TopbarShell } from '../../primitives/topbar-shell.tsx'

const meta = {
  title: 'Primitives/TopbarShell',
  component: TopbarShell,
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <>
        <TopbarGroup>
          <MutedHint>left group</MutedHint>
        </TopbarGroup>
        <TopbarGroup>
          <MutedHint>right group</MutedHint>
        </TopbarGroup>
      </>
    ),
  },
} satisfies Meta<typeof TopbarShell>

export default meta

export const Default: StoryObj<typeof meta> = {}
